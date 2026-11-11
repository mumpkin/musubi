// SPDX-License-Identifier: GPL-3.0-or-later
//! Files of a note, copied into its `.assets` folder
//! (`docs/vault-format.md`, "Images and attachments").

use std::fs;
use std::path::Path;

use sha2::{Digest, Sha256};

use crate::error::VaultError;
use crate::naming::{self, Folder};
use crate::paths;
use crate::vault::Vault;

const ASSETS_SUFFIX: &str = ".assets";
/// Extensions of the images Typst can show.
const IMAGE_EXTENSIONS: [&str; 6] =
	["png", "jpg", "jpeg", "gif", "svg", "webp"];

/// Whether `name` is an image Typst can show, by its extension.
#[must_use]
pub fn is_image(name: &str) -> bool {
	name.rsplit_once('.').is_some_and(|(_, extension)| {
		IMAGE_EXTENSIONS.contains(&extension.to_lowercase().as_str())
	})
}

/// `note` (from the vault root, with `.typ`) split into its folder and
/// stem.
fn folder_and_stem(note: &str) -> (&str, &str) {
	let target = note.strip_suffix(".typ").unwrap_or(note);
	target.rsplit_once('/').unwrap_or(("", target))
}

/// The name of a copied file: the stem cleaned by the naming rules, the
/// extension lowercased.
fn clean_name(name: &str) -> (String, String) {
	match name.rsplit_once('.') {
		Some((stem, extension)) if !stem.is_empty() => (
			naming::base_stem(stem),
			format!(".{}", extension.to_lowercase()),
		),
		_ => (naming::base_stem(name), String::new()),
	}
}

/// An existing file of `folder` with the same content, if any.
fn same_content(
	folder: &Path,
	bytes: &[u8],
) -> Result<Option<String>, VaultError> {
	let hash = Sha256::digest(bytes);
	for entry in fs::read_dir(folder)? {
		let path = entry?.path();
		let is_same_size = fs::metadata(&path).is_ok_and(|metadata| {
			metadata.is_file() && metadata.len() == bytes.len() as u64
		});
		if is_same_size && Sha256::digest(fs::read(&path)?) == hash {
			return Ok(path
				.file_name()
				.map(|name| name.to_string_lossy().into_owned()));
		}
	}
	Ok(None)
}

/// A file to copy into a note.
pub struct NewAsset<'file> {
	/// Its original name, such as `Capture d’écran.PNG`.
	pub name: &'file str,
	pub bytes: &'file [u8],
}

/// Writes `asset` into `directory` under a free name; returns the name.
fn store(directory: &Path, asset: &NewAsset<'_>) -> Result<String, VaultError> {
	let existing: Vec<String> = fs::read_dir(directory)?
		.filter_map(Result::ok)
		.map(|entry| entry.file_name().to_string_lossy().into_owned())
		.collect();
	let (base, extension) = clean_name(asset.name);
	let unique = Folder {
		existing: &existing,
		own: None,
	}
	.unique(&base, &[extension.as_str()]);
	let file = format!("{unique}{extension}");
	fs::write(paths::resolve(directory, &file)?, asset.bytes)?;
	Ok(file)
}

/// The `.assets` folder of `note`, from the vault root.
fn assets_folder(note: &str) -> String {
	let (folder, stem) = folder_and_stem(note);
	if folder.is_empty() {
		format!("{stem}{ASSETS_SUFFIX}")
	} else {
		format!("{folder}/{stem}{ASSETS_SUFFIX}")
	}
}

impl Vault {
	/// Copies `asset` into the `.assets` folder of `note`. A file with the
	/// same content is reused; a name taken by another file gets a suffix
	/// (`triangle_2.png`). Returns the path to write in the note, relative
	/// to it (`Note.assets/triangle.png`).
	///
	/// # Errors
	///
	/// [`VaultError::NotANote`], [`VaultError::OutsideVault`], a read-only
	/// vault, or an I/O error.
	pub fn add_asset(
		&self,
		note: &str,
		asset: &NewAsset<'_>,
	) -> Result<String, VaultError> {
		self.read_note(note)?;
		let directory = self.writable_folder(&assets_folder(note))?;
		let file = match same_content(&directory, asset.bytes)? {
			Some(existing) => existing,
			None => store(&directory, asset)?,
		};
		let (_, stem) = folder_and_stem(note);
		Ok(format!("{stem}{ASSETS_SUFFIX}/{file}"))
	}

	/// Files of the `.assets` folder of `note`, as paths relative to the
	/// note, sorted.
	///
	/// # Errors
	///
	/// [`VaultError::OutsideVault`] or an I/O error.
	pub fn assets(&self, note: &str) -> Result<Vec<String>, VaultError> {
		let (_, stem) = folder_and_stem(note);
		let assets = format!("{stem}{ASSETS_SUFFIX}");
		let directory = paths::resolve(self.root(), &assets_folder(note))?;
		if !directory.is_dir() {
			return Ok(Vec::new());
		}
		let mut files: Vec<String> = fs::read_dir(directory)?
			.filter_map(Result::ok)
			.filter(|entry| entry.path().is_file())
			.map(|entry| {
				format!("{assets}/{}", entry.file_name().to_string_lossy())
			})
			.collect();
		files.sort();
		Ok(files)
	}
}

#[cfg(test)]
mod tests {
	use super::{clean_name, is_image};

	#[test]
	fn cleans_the_stem_and_lowercases_the_extension() {
		assert_eq!(
			clean_name("Capture d’écran 2026.PNG"),
			("Capture_d’écran_2026".into(), ".png".into())
		);
		assert_eq!(clean_name("README"), ("README".into(), String::new()));
	}

	#[test]
	fn recognises_images() {
		assert!(is_image("a.PNG"));
		assert!(is_image("b.svg"));
		assert!(!is_image("c.pdf"));
		assert!(!is_image("png"));
	}
}
