// SPDX-License-Identifier: GPL-3.0-or-later
//! The trash of a vault: deleted notes, with their `.assets` folder, kept
//! in `.musubi/trash/` until restored or purged (`docs/vault-format.md`,
//! "Trash").

use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use ts_rs::TS;

use crate::error::VaultError;
use crate::links;
use crate::naming::{Folder, NOTE_EXTENSIONS};
use crate::paths;
use crate::title;
use crate::trash_folder::folder_entry;
use crate::utc;
use crate::vault::Vault;

const TRASH_FOLDER: &str = ".musubi/trash";
const ENTRY_FILE: &str = "entry.json";
const ASSETS_SUFFIX: &str = ".assets";
/// Hex digits of the random part of an entry name.
const RANDOM_BYTES: usize = 4;

/// `entry.json`.
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct EntryFile {
	pub(crate) original_path: String,
	pub(crate) deleted_at: String,
	/// The entry holds a folder, not a note.
	#[serde(default, skip_serializing_if = "std::ops::Not::not")]
	pub(crate) folder: bool,
}

/// A note in the trash.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct TrashEntry {
	/// Name of the entry folder, such as `20261110T140322Z-3fa9c1d2`.
	pub id: String,
	/// Where the note was, from the vault root.
	pub original_path: String,
	/// Deletion time, UTC, RFC 3339.
	pub deleted_at: String,
	/// Title of the note, or name of the folder.
	pub title: String,
	pub is_folder: bool,
	/// Notes in the entry: 1 for a note.
	pub note_count: u32,
}

/// Seconds since the Unix epoch.
#[must_use]
pub fn now() -> i64 {
	SystemTime::now()
		.duration_since(UNIX_EPOCH)
		.map_or(0, |time| i64::try_from(time.as_secs()).unwrap_or(i64::MAX))
}

/// Hex digits that differ between devices and deletions: a hash of the
/// time in nanoseconds, the process and the note.
pub(crate) fn random_part(note: &str) -> String {
	let nanos = SystemTime::now()
		.duration_since(UNIX_EPOCH)
		.map_or(0, |time| time.as_nanos());
	let seed = format!("{nanos}:{}:{note}", std::process::id());
	Sha256::digest(seed.as_bytes())
		.iter()
		.take(RANDOM_BYTES)
		.map(|byte| format!("{byte:02x}"))
		.collect()
}

fn assets_of(note: &str) -> String {
	format!(
		"{}{ASSETS_SUFFIX}",
		note.strip_suffix(".typ").unwrap_or(note)
	)
}

pub(crate) fn move_into(from: &Path, to: &Path) -> Result<(), VaultError> {
	if let Some(parent) = to.parent() {
		fs::create_dir_all(parent)?;
	}
	fs::rename(from, to)?;
	Ok(())
}

impl Vault {
	fn trash_dir(&self) -> PathBuf {
		self.root().join(TRASH_FOLDER)
	}

	pub(crate) fn entry_dir(&self, id: &str) -> Result<PathBuf, VaultError> {
		if id.is_empty() || id.contains(['/', '\\']) || id.starts_with('.') {
			return Err(VaultError::OutsideVault(id.to_owned()));
		}
		Ok(self.trash_dir().join(id))
	}

	/// Moves `note` and its `.assets` folder to the trash, as deleted at
	/// `deleted_at` (seconds since the epoch). Returns the entry.
	///
	/// # Errors
	///
	/// [`VaultError::NotANote`], [`VaultError::OutsideVault`], a read-only
	/// vault, or an I/O error.
	pub fn trash_note(
		&self,
		note: &str,
		deleted_at: i64,
	) -> Result<TrashEntry, VaultError> {
		let source = self.read_note(note)?;
		self.writable_folder("")?;
		// Before moving anything: a restored note is not pinned again.
		self.unpin(note)?;
		let id = format!("{}-{}", utc::compact(deleted_at), random_part(note));
		let entry = self.entry_dir(&id)?;
		let assets = assets_of(note);
		let assets_path = paths::resolve(self.root(), &assets)?;
		move_into(&paths::resolve(self.root(), note)?, &entry.join(note))?;
		if assets_path.is_dir() {
			move_into(&assets_path, &entry.join(&assets))?;
		}
		let file = EntryFile {
			original_path: note.to_owned(),
			deleted_at: utc::rfc3339(deleted_at),
			folder: false,
		};
		write_entry_file(&entry, &file)?;
		Ok(TrashEntry {
			id,
			original_path: file.original_path,
			deleted_at: file.deleted_at,
			title: title::heading_title(&source)
				.unwrap_or_else(|| title::stem_title(&stem_of(note))),
			is_folder: false,
			note_count: 1,
		})
	}

	fn read_entry(&self, id: &str) -> Option<TrashEntry> {
		let entry = self.entry_dir(id).ok()?;
		let text = fs::read_to_string(entry.join(ENTRY_FILE)).ok()?;
		let file: EntryFile = serde_json::from_str(&text).ok()?;
		if file.folder {
			return Some(folder_entry(id, &entry, file));
		}
		let source = fs::read_to_string(entry.join(&file.original_path)).ok();
		let title = source
			.as_deref()
			.and_then(title::heading_title)
			.unwrap_or_else(|| {
				title::stem_title(&stem_of(&file.original_path))
			});
		Some(TrashEntry {
			id: id.to_owned(),
			original_path: file.original_path,
			deleted_at: file.deleted_at,
			title,
			is_folder: false,
			note_count: 1,
		})
	}

	/// The entries of the trash, newest first. Unreadable entries are
	/// skipped.
	///
	/// # Errors
	///
	/// An I/O error if the trash cannot be read.
	pub fn trash_entries(&self) -> Result<Vec<TrashEntry>, VaultError> {
		let directory = self.trash_dir();
		if !directory.is_dir() {
			return Ok(Vec::new());
		}
		let mut entries: Vec<TrashEntry> = fs::read_dir(directory)?
			.filter_map(Result::ok)
			.filter_map(|entry| {
				self.read_entry(&entry.file_name().to_string_lossy())
			})
			.collect();
		entries.sort_by(|left, right| right.id.cmp(&left.id));
		Ok(entries)
	}

	/// Puts the note of entry `id` back where it was, with a collision
	/// suffix if the path is taken, and removes the entry. Returns the path
	/// of the restored note.
	///
	/// # Errors
	///
	/// [`VaultError::NotANote`] for an unknown entry, a read-only vault, or
	/// an I/O error.
	pub fn restore(&self, id: &str) -> Result<String, VaultError> {
		let entry = self
			.read_entry(id)
			.ok_or_else(|| VaultError::NotANote(id.to_owned()))?;
		let original = entry.original_path;
		if entry.is_folder {
			return self.restore_folder(id, &original);
		}
		let folder = original.rfind('/').map_or("", |slash| &original[..slash]);
		let directory = self.writable_folder(folder)?;
		let restored = free_path(&directory, folder, &original)?;
		let entry_dir = self.entry_dir(id)?;
		move_into(&entry_dir.join(&original), &self.root().join(&restored))?;
		let assets = entry_dir.join(assets_of(&original));
		if assets.is_dir() {
			move_into(&assets, &self.root().join(assets_of(&restored)))?;
		}
		if restored != original {
			self.follow_assets(&restored, &stem_of(&original))?;
		}
		fs::remove_dir_all(entry_dir)?;
		Ok(restored)
	}

	/// After a restore under a new name, the note's image paths into its
	/// own `.assets` folder follow it.
	fn follow_assets(
		&self,
		note: &str,
		old_stem: &str,
	) -> Result<(), VaultError> {
		let old_assets = format!("{old_stem}{ASSETS_SUFFIX}/");
		let new_assets = format!("{}{ASSETS_SUFFIX}/", stem_of(note));
		let source = self.read_note(note)?;
		let rewritten = links::rewrite_images(&source, &|path| {
			path.strip_prefix(&old_assets)
				.map(|rest| format!("{new_assets}{rest}"))
		});
		if let Some(text) = rewritten {
			self.write_note(note, &text)?;
		}
		Ok(())
	}
}

pub(crate) fn write_entry_file(
	entry: &Path,
	file: &EntryFile,
) -> Result<(), VaultError> {
	let json = serde_json::to_string_pretty(file)
		.map_err(|error| VaultError::Io(error.into()))?;
	fs::write(entry.join(ENTRY_FILE), json + "\n")?;
	Ok(())
}

fn stem_of(note: &str) -> String {
	let name = note.rsplit('/').next().unwrap_or(note);
	name.strip_suffix(".typ").unwrap_or(name).to_owned()
}

/// `original`, or the same name with a collision suffix if a note or an
/// `.assets` folder already uses it.
fn free_path(
	directory: &Path,
	folder: &str,
	original: &str,
) -> Result<String, VaultError> {
	let existing: Vec<String> = fs::read_dir(directory)?
		.filter_map(Result::ok)
		.map(|entry| entry.file_name().to_string_lossy().into_owned())
		.collect();
	let stem = Folder {
		existing: &existing,
		own: None,
	}
	.unique(&stem_of(original), &NOTE_EXTENSIONS);
	Ok(if folder.is_empty() {
		format!("{stem}.typ")
	} else {
		format!("{folder}/{stem}.typ")
	})
}
