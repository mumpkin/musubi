// SPDX-License-Identifier: GPL-3.0-or-later
//! A vault: a folder of notes, the only source of truth
//! (`docs/vault-format.md`).

use std::fs;
use std::io::{self, Write as _};
use std::path::{Path, PathBuf};

use serde::Serialize;
use ts_rs::TS;

use crate::error::VaultError;
use crate::naming::{self, Folder};
use crate::paths;
use crate::title;

/// Version of the vault format this build reads and writes.
pub const FORMAT: u64 = 0;
pub(crate) const MUSUBI_FOLDER: &str = ".musubi";
pub(crate) const SETTINGS_FILE: &str = "vault.json";
const NOTE_EXTENSION: &str = "typ";
const ASSETS_EXTENSION: &str = "assets";
const DEFAULT_RETENTION_DAYS: u64 = 30;
pub(crate) const TRASH_RETENTION: &str = "trashRetentionDays";
const DEFAULT_SETTINGS: &str =
	"{\n\t\"format\": 0,\n\t\"trashRetentionDays\": 30\n}\n";

/// A note of the vault, as the explorer shows it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, TS)]
#[ts(export)]
pub struct NoteEntry {
	/// Path from the vault root, with `/` separators and the extension.
	pub path: String,
	pub title: String,
}

/// Folders and notes of a vault, sorted by path, and the pinned notes.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct VaultTree {
	pub folders: Vec<String>,
	pub notes: Vec<NoteEntry>,
	/// Paths of the pinned notes that exist, in the order of the pins.
	pub pinned: Vec<String>,
}

pub struct Vault {
	root: PathBuf,
	/// A vault in a newer format opens read-only.
	pub read_only: bool,
	/// Days before trash entries are purged; `0` keeps them.
	pub trash_retention_days: u64,
}

impl Vault {
	/// Opens the folder at `root` as a vault, creating `.musubi/vault.json`
	/// the first time.
	///
	/// # Errors
	///
	/// An I/O error if the folder cannot be read or the settings written.
	pub fn open(root: &Path) -> Result<Self, VaultError> {
		let root = root.canonicalize()?;
		let settings = root.join(MUSUBI_FOLDER).join(SETTINGS_FILE);
		if !settings.exists() {
			fs::create_dir_all(root.join(MUSUBI_FOLDER))?;
			fs::write(&settings, DEFAULT_SETTINGS)?;
		}
		let values = read_settings(&settings);
		let format = values
			.get("format")
			.and_then(serde_json::Value::as_u64)
			.unwrap_or(FORMAT);
		Ok(Self {
			root,
			read_only: format > FORMAT,
			trash_retention_days: values
				.get(TRASH_RETENTION)
				.and_then(serde_json::Value::as_u64)
				.unwrap_or(DEFAULT_RETENTION_DAYS),
		})
	}

	#[must_use]
	pub fn root(&self) -> &Path {
		&self.root
	}

	/// Folders and notes, without hidden entries and `.assets` folders.
	///
	/// # Errors
	///
	/// An I/O error if a folder cannot be read.
	pub fn tree(&self) -> Result<VaultTree, VaultError> {
		let mut tree = VaultTree::default();
		self.collect(&self.root, &mut tree)?;
		tree.folders.sort();
		tree.notes.sort_by(|left, right| left.path.cmp(&right.path));
		tree.pinned = self
			.pinned()
			.into_iter()
			.filter(|pin| tree.notes.iter().any(|note| note.path == *pin))
			.collect();
		Ok(tree)
	}

	fn collect(
		&self,
		folder: &Path,
		tree: &mut VaultTree,
	) -> Result<(), VaultError> {
		for entry in fs::read_dir(folder)? {
			let path = entry?.path();
			let Some(name) = path.file_name().and_then(|name| name.to_str())
			else {
				continue;
			};
			if name.starts_with('.') {
				continue;
			}
			if path.is_dir() {
				if path
					.extension()
					.is_some_and(|extension| extension == ASSETS_EXTENSION)
				{
					continue;
				}
				tree.folders.push(paths::relative(&self.root, &path));
				self.collect(&path, tree)?;
			} else if is_note(&path) {
				tree.notes.push(self.entry(&path));
			}
		}
		Ok(())
	}

	fn entry(&self, path: &Path) -> NoteEntry {
		let stem = path
			.file_stem()
			.map(|stem| stem.to_string_lossy())
			.unwrap_or_default();
		let title = fs::read_to_string(path)
			.ok()
			.and_then(|source| title::heading_title(&source))
			.unwrap_or_else(|| title::stem_title(&stem));
		NoteEntry {
			path: paths::relative(&self.root, path),
			title,
		}
	}

	/// Source of the note at `note` (from the vault root).
	///
	/// # Errors
	///
	/// [`VaultError::OutsideVault`], [`VaultError::NotANote`] or an I/O error.
	pub fn read_note(&self, note: &str) -> Result<String, VaultError> {
		let path = paths::resolve(&self.root, note)?;
		if !is_note(&path) {
			return Err(VaultError::NotANote(note.to_owned()));
		}
		Ok(fs::read_to_string(path)?)
	}

	/// Saves `content` as the note at `note`. The text goes to a temporary
	/// file first, renamed over the note: a crash or a sync tool never sees
	/// a half-written note.
	///
	/// # Errors
	///
	/// [`VaultError::OutsideVault`], [`VaultError::NotANote`], a read-only
	/// vault, or an I/O error.
	pub fn write_note(
		&self,
		note: &str,
		content: &str,
	) -> Result<(), VaultError> {
		if self.read_only {
			return Err(VaultError::NewerFormat(FORMAT + 1));
		}
		let path = paths::resolve(&self.root, note)?;
		if !is_note(&path) {
			return Err(VaultError::NotANote(note.to_owned()));
		}
		let temporary = path.with_extension("typ.musubi-tmp");
		fs::write(&temporary, content)?;
		fs::rename(&temporary, &path)?;
		Ok(())
	}

	/// Creates a note titled `title` in `folder` (`""` for the root), named
	/// from the title. Returns its path. A `title` with `/` is a path from
	/// `folder`: `Ideas/My note` creates `My note` in `Ideas`, which is
	/// created if missing.
	///
	/// # Errors
	///
	/// [`VaultError::OutsideVault`] or an I/O error.
	pub fn create_note(
		&self,
		folder: &str,
		title: &str,
	) -> Result<String, VaultError> {
		let (folder, title) = naming::split_note_path(folder, title)?;
		let directory = self.writable_folder(&folder)?;
		let existing = names_in(&directory)?;
		let name = naming::note_file_name(
			&title,
			&Folder {
				existing: &existing,
				own: None,
			},
		);
		let path = directory.join(name);
		fs::write(&path, format!("= {}\n", title.trim()))?;
		Ok(paths::relative(&self.root, &path))
	}

	/// Creates the note at `note` (from the vault root, with the extension),
	/// titled `title`: the target of a link to a missing note. Missing
	/// folders are created.
	///
	/// # Errors
	///
	/// [`VaultError::OutsideVault`], [`VaultError::NotANote`],
	/// [`VaultError::AlreadyExists`], a read-only vault, or an I/O error.
	pub fn create_note_at(
		&self,
		note: &str,
		title: &str,
	) -> Result<(), VaultError> {
		if !note.ends_with(".typ") {
			return Err(VaultError::NotANote(note.to_owned()));
		}
		let folder = note.rfind('/').map_or("", |slash| &note[..slash]);
		self.writable_folder(folder)?;
		let path = paths::resolve(&self.root, note)?;
		let mut file = fs::OpenOptions::new()
			.write(true)
			.create_new(true)
			.open(&path)
			.map_err(|error| match error.kind() {
				io::ErrorKind::AlreadyExists => {
					VaultError::AlreadyExists(note.to_owned())
				}
				_ => VaultError::Io(error),
			})?;
		file.write_all(format!("= {}\n", title.trim()).as_bytes())?;
		Ok(())
	}

	/// Creates a folder named from `name` in `parent`. Returns its path.
	///
	/// # Errors
	///
	/// [`VaultError::OutsideVault`] or an I/O error.
	pub fn create_folder(
		&self,
		parent: &str,
		name: &str,
	) -> Result<String, VaultError> {
		let directory = self.writable_folder(parent)?;
		let existing = names_in(&directory)?;
		let folder = Folder {
			existing: &existing,
			own: None,
		};
		let path =
			directory.join(folder.unique(&naming::folder_stem(name), &[""]));
		fs::create_dir(&path)?;
		Ok(paths::relative(&self.root, &path))
	}

	pub(crate) fn writable_folder(
		&self,
		folder: &str,
	) -> Result<PathBuf, VaultError> {
		if self.read_only {
			return Err(VaultError::NewerFormat(FORMAT + 1));
		}
		let directory = paths::resolve(&self.root, folder)?;
		fs::create_dir_all(&directory)?;
		Ok(directory)
	}
}

fn is_note(path: &Path) -> bool {
	path.is_file()
		&& path
			.extension()
			.is_some_and(|extension| extension == NOTE_EXTENSION)
}

fn names_in(directory: &Path) -> Result<Vec<String>, VaultError> {
	Ok(fs::read_dir(directory)?
		.filter_map(Result::ok)
		.map(|entry| entry.file_name().to_string_lossy().into_owned())
		.collect())
}

/// Fields of `vault.json`; a missing or unreadable file has none, which
/// means the default values.
pub(crate) fn read_settings(settings: &Path) -> serde_json::Value {
	fs::read_to_string(settings)
		.ok()
		.and_then(|text| serde_json::from_str(&text).ok())
		.unwrap_or(serde_json::Value::Null)
}
