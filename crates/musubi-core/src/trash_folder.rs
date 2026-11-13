// SPDX-License-Identifier: GPL-3.0-or-later
//! Folders in the trash: one entry holds the folder with its notes,
//! sub-folders and `.assets` folders (`docs/vault-format.md`, "Trash").

use std::fs;
use std::path::Path;

use crate::error::VaultError;
use crate::naming::Folder;
use crate::paths;
use crate::trash::{
	EntryFile, TrashEntry, move_into, random_part, write_entry_file,
};
use crate::utc;
use crate::vault::{MUSUBI_FOLDER, Vault};

/// Notes (`.typ` files) under `directory`, at any depth.
fn count_notes(directory: &Path) -> u32 {
	let Ok(entries) = fs::read_dir(directory) else {
		return 0;
	};
	entries
		.filter_map(Result::ok)
		.map(|entry| entry.path())
		.map(|path| {
			if path.is_dir() {
				count_notes(&path)
			} else {
				u32::from(path.extension().is_some_and(|ext| ext == "typ"))
			}
		})
		.sum()
}

fn name_of(folder: &str) -> &str {
	folder.rsplit('/').next().unwrap_or(folder)
}

/// The trash entry of a folder, read from its entry directory.
pub(crate) fn folder_entry(
	id: &str,
	entry: &Path,
	file: EntryFile,
) -> TrashEntry {
	TrashEntry {
		id: id.to_owned(),
		title: name_of(&file.original_path).to_owned(),
		note_count: count_notes(&entry.join(&file.original_path)),
		original_path: file.original_path,
		deleted_at: file.deleted_at,
		is_folder: true,
	}
}

impl Vault {
	/// Moves `folder` (from the vault root) and everything in it to the
	/// trash, as deleted at `deleted_at`. Its notes are unpinned.
	///
	/// # Errors
	///
	/// [`VaultError::OutsideVault`] for the vault root, `.musubi` or a path
	/// outside, [`VaultError::NotANote`] if it is not a folder, a
	/// read-only vault, or an I/O error.
	pub fn trash_folder(
		&self,
		folder: &str,
		deleted_at: i64,
	) -> Result<TrashEntry, VaultError> {
		let folder = folder.trim_matches('/');
		if folder.is_empty() || folder.split('/').next() == Some(MUSUBI_FOLDER)
		{
			return Err(VaultError::OutsideVault(folder.to_owned()));
		}
		let path = paths::resolve(self.root(), folder)?;
		if !path.is_dir() {
			return Err(VaultError::NotANote(folder.to_owned()));
		}
		self.writable_folder("")?;
		let prefix = format!("{folder}/");
		for pin in self.pinned().iter().filter(|pin| pin.starts_with(&prefix)) {
			self.unpin(pin)?;
		}
		let inside = |entry: &str| entry.starts_with(&prefix);
		let links = self.unlink(&inside, &inside)?;
		let id =
			format!("{}-{}", utc::compact(deleted_at), random_part(folder));
		let entry = self.entry_dir(&id)?;
		move_into(&path, &entry.join(folder))?;
		let file = EntryFile {
			original_path: folder.to_owned(),
			deleted_at: utc::rfc3339(deleted_at),
			folder: true,
			links,
		};
		write_entry_file(&entry, &file)?;
		Ok(folder_entry(&id, &entry, file))
	}

	/// Puts the folder of entry `id` back at `original`, under a free name
	/// if it is taken. Returns the path of the restored folder.
	pub(crate) fn restore_folder(
		&self,
		id: &str,
		original: &str,
	) -> Result<String, VaultError> {
		let parent = original.rfind('/').map_or("", |slash| &original[..slash]);
		let directory = self.writable_folder(parent)?;
		let existing: Vec<String> = fs::read_dir(&directory)?
			.filter_map(Result::ok)
			.map(|entry| entry.file_name().to_string_lossy().into_owned())
			.collect();
		let name = Folder {
			existing: &existing,
			own: None,
		}
		.unique(name_of(original), &[""]);
		let restored = if parent.is_empty() {
			name
		} else {
			format!("{parent}/{name}")
		};
		let entry_dir = self.entry_dir(id)?;
		move_into(&entry_dir.join(original), &self.root().join(&restored))?;
		fs::remove_dir_all(entry_dir)?;
		Ok(restored)
	}
}
