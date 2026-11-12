// SPDX-License-Identifier: GPL-3.0-or-later
//! The archive: notes and folders moved to `Archive/` at the vault root,
//! keeping their path, and back (`docs/vault-format.md`, "Archive"). Links
//! and pins follow, as for a rename.

use std::fs;

use crate::error::VaultError;
use crate::links::Renaming;
use crate::naming::{Folder, NOTE_EXTENSIONS};
use crate::paths;
use crate::rename::{move_files, target_of, update_notes};
use crate::title;
use crate::vault::Vault;

/// The folder of archived notes, at the vault root.
pub const ARCHIVE_FOLDER: &str = "Archive";

pub(crate) fn split(path: &str) -> (&str, &str) {
	path.rfind('/')
		.map_or(("", path), |slash| (&path[..slash], &path[slash + 1..]))
}

pub(crate) fn join(folder: &str, name: &str) -> String {
	if folder.is_empty() {
		name.to_owned()
	} else {
		format!("{folder}/{name}")
	}
}

impl Vault {
	/// Moves the note or folder at `path` to `Archive/<path>`. Returns its
	/// new path.
	///
	/// # Errors
	///
	/// [`VaultError::OutsideVault`] for a path already in the archive or
	/// outside the vault, a missing path, a read-only vault, or an I/O
	/// error.
	pub fn archive(&self, path: &str) -> Result<String, VaultError> {
		if path == ARCHIVE_FOLDER
			|| path.starts_with(&format!("{ARCHIVE_FOLDER}/"))
		{
			return Err(VaultError::OutsideVault(path.to_owned()));
		}
		self.relocate(path, &join(ARCHIVE_FOLDER, path))
	}

	/// Moves the archived note or folder at `path` (in `Archive/`) back to
	/// its original path. Returns that path.
	///
	/// # Errors
	///
	/// [`VaultError::OutsideVault`] for a path outside the archive, a
	/// missing path, a read-only vault, or an I/O error.
	pub fn unarchive(&self, path: &str) -> Result<String, VaultError> {
		let original = path
			.strip_prefix(&format!("{ARCHIVE_FOLDER}/"))
			.filter(|rest| !rest.is_empty())
			.ok_or_else(|| VaultError::OutsideVault(path.to_owned()))?;
		let moved = self.relocate(path, original)?;
		self.prune_archive(split(path).0);
		Ok(moved)
	}

	/// Removes `folder` and its parents, up to `Archive/` itself, while
	/// they are empty: an emptied archive leaves nothing behind.
	fn prune_archive(&self, folder: &str) {
		let mut current = folder;
		while !current.is_empty() {
			if fs::remove_dir(self.root().join(current)).is_err() {
				return;
			}
			current = split(current).0;
		}
	}

	/// Moves `from` to `to`, or to a free name next to it. Within the same
	/// folder, `from` does not take a free name to avoid itself: a change
	/// of case keeps the name.
	pub(crate) fn relocate(
		&self,
		from: &str,
		to: &str,
	) -> Result<String, VaultError> {
		if to.starts_with(&format!("{from}/")) {
			return Err(VaultError::IntoItself(from.to_owned()));
		}
		let source = paths::resolve(self.root(), from)?;
		let (folder, name) = split(to);
		let directory = self.writable_folder(folder)?;
		let existing: Vec<String> = fs::read_dir(&directory)?
			.filter_map(Result::ok)
			.map(|entry| entry.file_name().to_string_lossy().into_owned())
			.collect();
		let (from_folder, from_name) = split(from);
		let names = Folder {
			existing: &existing,
			own: (from_folder == folder).then_some(from_name),
		};
		if source.is_dir() {
			let moved = join(folder, &names.unique(name, &[""]));
			let notes = self.notes_under(from)?;
			fs::rename(&source, self.root().join(&moved))?;
			for note in notes {
				let renamed = format!("{moved}{}", &note[from.len()..]);
				self.follow(&note, &renamed)?;
			}
			return Ok(moved);
		}
		let stem = names.unique(target_of(name), &NOTE_EXTENSIONS);
		let moved = join(folder, &format!("{stem}.typ"));
		let text = self.read_note(from)?;
		move_files(self, from, &moved)?;
		self.follow_text((from, &moved), &text)?;
		Ok(moved)
	}

	fn notes_under(&self, folder: &str) -> Result<Vec<String>, VaultError> {
		let prefix = format!("{folder}/");
		Ok(self
			.tree()?
			.notes
			.into_iter()
			.map(|note| note.path)
			.filter(|path| path.starts_with(&prefix))
			.collect())
	}

	/// After `old` moved to `new`: its pin and the links to it follow.
	fn follow(&self, old: &str, new: &str) -> Result<(), VaultError> {
		let text = self.read_note(new)?;
		self.follow_text((old, new), &text)
	}

	/// `text` is the source of the note, for its title.
	fn follow_text(
		&self,
		(old, new): (&str, &str),
		text: &str,
	) -> Result<(), VaultError> {
		self.rename_pin(old, new)?;
		let title = title::heading_title(text)
			.unwrap_or_else(|| title::stem_title(target_of(split(old).1)));
		update_notes(
			self,
			&Renaming {
				old_target: target_of(old),
				new_target: target_of(new),
				old_title: &title,
				new_title: &title,
			},
		)
	}
}
