// SPDX-License-Identifier: GPL-3.0-or-later
//! Conflict copies made by sync tools next to a note, when two devices
//! changed it at once (`docs/vault-format.md`, "Sync conflicts"). They are
//! not notes of the vault: the explorer lists them apart, to resolve.

use std::fs;
use std::path::Path;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::error::VaultError;
use crate::paths;
use crate::trash::now;
use crate::vault::{MUSUBI_FOLDER, Vault};

/// A conflict copy and the note it is a copy of.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Conflict {
	/// Path of the copy, from the vault root.
	pub copy: String,
	/// Path of the note, which may be missing.
	pub note: String,
	/// The sync tool that made the copy: `Syncthing`, `Nextcloud` or
	/// `Dropbox`.
	pub tool: String,
}

/// Which version a resolution keeps.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum Keep {
	/// The note: the copy goes to the trash.
	Note,
	/// The copy: it replaces the note, whose old text goes to the trash.
	Copy,
}

const SYNCTHING: &str = ".sync-conflict-";
const NEXTCLOUD: &str = " (conflicted copy ";
const DROPBOX: &str = "'s conflicted copy ";

/// The stem of the note and the tool, if `name` is a conflict copy of a
/// note: `Note.sync-conflict-20261113-101500-ABCDEFG.typ`,
/// `Note (conflicted copy 2026-11-13 101500).typ`,
/// `Note (Name's conflicted copy 2026-11-13).typ`.
#[must_use]
pub fn conflict_of(name: &str) -> Option<(&str, &'static str)> {
	let stem = name.strip_suffix(".typ")?;
	if let Some(index) = stem.find(SYNCTHING) {
		return Some((&stem[..index], "Syncthing"));
	}
	if let Some(index) = stem.find(NEXTCLOUD) {
		return Some((&stem[..index], "Nextcloud"));
	}
	let marker = stem.find(DROPBOX)?;
	let open = stem[..marker].rfind(" (")?;
	Some((&stem[..open], "Dropbox"))
}

fn join(folder: &str, name: &str) -> String {
	if folder.is_empty() {
		name.to_owned()
	} else {
		format!("{folder}/{name}")
	}
}

/// Adds the conflict copies under `directory` (`folder` from the root).
fn collect_conflicts(
	directory: &Path,
	folder: &str,
	found: &mut Vec<Conflict>,
) -> Result<(), VaultError> {
	for entry in fs::read_dir(directory)?.filter_map(Result::ok) {
		let name = entry.file_name().to_string_lossy().into_owned();
		if name.starts_with('.') || name == MUSUBI_FOLDER {
			continue;
		}
		let path = entry.path();
		if path.is_dir() {
			collect_conflicts(&path, &join(folder, &name), found)?;
		} else if let Some((stem, tool)) = conflict_of(&name) {
			found.push(Conflict {
				copy: join(folder, &name),
				note: join(folder, &format!("{stem}.typ")),
				tool: tool.to_owned(),
			});
		}
	}
	Ok(())
}

impl Vault {
	/// The conflict copies of the vault, in path order.
	///
	/// # Errors
	///
	/// An I/O error if a folder cannot be read.
	pub fn conflicts(&self) -> Result<Vec<Conflict>, VaultError> {
		let mut found = Vec::new();
		collect_conflicts(self.root(), "", &mut found)?;
		found.sort_by(|left, right| left.copy.cmp(&right.copy));
		Ok(found)
	}

	/// Resolves the conflict of `copy` (a conflict copy, from the vault
	/// root), keeping one version; the other goes to the trash.
	///
	/// # Errors
	///
	/// [`VaultError::NotANote`] if `copy` is not a conflict copy, a
	/// read-only vault, or an I/O error.
	pub fn resolve_conflict(
		&self,
		copy: &str,
		keep: Keep,
	) -> Result<(), VaultError> {
		let name = copy.rsplit('/').next().unwrap_or(copy);
		let (stem, _) = conflict_of(name)
			.ok_or_else(|| VaultError::NotANote(copy.to_owned()))?;
		let folder = copy.rfind('/').map_or("", |slash| &copy[..slash]);
		let note = join(folder, &format!("{stem}.typ"));
		paths::resolve(self.root(), copy)?;
		if keep == Keep::Copy {
			// The copy takes the place of the note; the old text takes the
			// place of the copy, which goes to the trash.
			let kept = self.read_note(copy)?;
			let old = self.read_note(&note).unwrap_or_default();
			fs::write(self.root().join(&note), kept)?;
			self.write_note(copy, &old)?;
		}
		self.trash_note(copy, now())?;
		Ok(())
	}
}

#[cfg(test)]
mod tests {
	use super::conflict_of;

	#[test]
	fn recognises_the_copies_of_sync_tools() {
		assert_eq!(
			conflict_of("My_note.sync-conflict-20261113-101500-ABCDEFG.typ"),
			Some(("My_note", "Syncthing"))
		);
		assert_eq!(
			conflict_of("My note (conflicted copy 2026-11-13 101500).typ"),
			Some(("My note", "Nextcloud"))
		);
		assert_eq!(
			conflict_of("Note (Jane's conflicted copy 2026-11-13).typ"),
			Some(("Note", "Dropbox"))
		);
		assert_eq!(conflict_of("Note (draft).typ"), None);
		assert_eq!(conflict_of("Note.typ"), None);
	}
}
