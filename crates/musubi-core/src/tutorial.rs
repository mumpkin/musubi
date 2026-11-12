// SPDX-License-Identifier: GPL-3.0-or-later
//! The tutorial, a treasure hunt: notes in a `Welcome` folder, embedded in the binary
//! (`tutorial/` in the repository) and written into a vault on request.

use std::fs;

use crate::error::VaultError;
use crate::paths;
use crate::vault::Vault;

/// The folder of the tutorial in a vault.
const FOLDER: &str = "Welcome";

/// Files of the tutorial, by path inside its folder. Text files only.
const FILES: [(&str, &str); 10] = [
	(
		"Start_here.typ",
		include_str!("../../../tutorial/Start_here.typ"),
	),
	(
		"Find_anything.typ",
		include_str!("../../../tutorial/Find_anything.typ"),
	),
	(
		"The_lighthouse.typ",
		include_str!("../../../tutorial/The_lighthouse.typ"),
	),
	(
		"Helix_workshop.typ",
		include_str!("../../../tutorial/Helix_workshop.typ"),
	),
	(
		"Pins_and_themes.typ",
		include_str!("../../../tutorial/Pins_and_themes.typ"),
	),
	(
		"Writing_Typst.typ",
		include_str!("../../../tutorial/Writing_Typst.typ"),
	),
	(
		"Helix_basics.typ",
		include_str!("../../../tutorial/Helix_basics.typ"),
	),
	(
		"Typst_basics.typ",
		include_str!("../../../tutorial/Typst_basics.typ"),
	),
	(
		"Using_Musubi.typ",
		include_str!("../../../tutorial/Using_Musubi.typ"),
	),
	(
		"Typst_basics.assets/musubi.svg",
		include_str!("../../../tutorial/Typst_basics.assets/musubi.svg"),
	),
];

/// The first note of the tutorial, from the vault root.
pub const START: &str = "Welcome/Start_here.typ";

impl Vault {
	/// Writes the files of the tutorial that are missing from the vault,
	/// without touching those that exist (the user may have changed them).
	/// Returns the path of the first note.
	///
	/// # Errors
	///
	/// A read-only vault or an I/O error.
	pub fn install_tutorial(&self) -> Result<&'static str, VaultError> {
		self.writable_folder(FOLDER)?;
		for (name, content) in FILES {
			let path =
				paths::resolve(self.root(), &format!("{FOLDER}/{name}"))?;
			if path.exists() {
				continue;
			}
			if let Some(parent) = path.parent() {
				fs::create_dir_all(parent)?;
			}
			fs::write(path, content)?;
		}
		Ok(START)
	}
}
