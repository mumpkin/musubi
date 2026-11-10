// SPDX-License-Identifier: GPL-3.0-or-later
//! A vault: a folder of notes, the only source of truth
//! (`docs/vault-format.md`).

use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;
use ts_rs::TS;

use crate::error::VaultError;
use crate::naming::{self, Folder};
use crate::paths;
use crate::title;

/// Version of the vault format this build reads and writes.
pub const FORMAT: u64 = 0;
const MUSUBI_FOLDER: &str = ".musubi";
const SETTINGS_FILE: &str = "vault.json";
const NOTE_EXTENSION: &str = "typ";
const ASSETS_EXTENSION: &str = "assets";
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

/// Folders and notes of a vault, sorted by path.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct VaultTree {
	pub folders: Vec<String>,
	pub notes: Vec<NoteEntry>,
}

pub struct Vault {
	root: PathBuf,
	/// A vault in a newer format opens read-only.
	pub read_only: bool,
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
		let format = read_format(&settings);
		Ok(Self {
			root,
			read_only: format > FORMAT,
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

	/// Creates a note titled `title` in `folder` (`""` for the root), named
	/// from the title. Returns its path.
	///
	/// # Errors
	///
	/// [`VaultError::OutsideVault`] or an I/O error.
	pub fn create_note(
		&self,
		folder: &str,
		title: &str,
	) -> Result<String, VaultError> {
		let directory = self.writable_folder(folder)?;
		let existing = names_in(&directory)?;
		let name = naming::note_file_name(
			title,
			&Folder {
				existing: &existing,
				own: None,
			},
		);
		let path = directory.join(name);
		fs::write(&path, format!("= {}\n", title.trim()))?;
		Ok(paths::relative(&self.root, &path))
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
			directory.join(folder.unique(&naming::base_stem(name), &[""]));
		fs::create_dir(&path)?;
		Ok(paths::relative(&self.root, &path))
	}

	fn writable_folder(&self, folder: &str) -> Result<PathBuf, VaultError> {
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

/// Format of the vault; a missing or unreadable file means format 0.
fn read_format(settings: &Path) -> u64 {
	fs::read_to_string(settings)
		.ok()
		.and_then(|text| serde_json::from_str::<serde_json::Value>(&text).ok())
		.and_then(|value| value.get("format")?.as_u64())
		.unwrap_or(FORMAT)
}
