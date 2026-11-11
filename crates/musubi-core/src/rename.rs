// SPDX-License-Identifier: GPL-3.0-or-later
//! Saving a note whose title changed: the file and its `.assets` folder are
//! renamed from the new title, and the links and image paths of every note
//! follow (`docs/vault-format.md`, "Renaming").

use std::fs;
use std::path::Path;

use crate::error::VaultError;
use crate::links::{self, Renaming};
use crate::naming::{self, Folder, NOTE_EXTENSIONS};
use crate::paths;
use crate::title;
use crate::vault::Vault;

const ASSETS_SUFFIX: &str = ".assets";

/// `path` without its `.typ` extension: the target of a `note-link`.
fn target_of(path: &str) -> &str {
	path.strip_suffix(".typ").unwrap_or(path)
}

fn parent_of(path: &str) -> &str {
	path.rfind('/').map_or("", |slash| &path[..slash])
}

fn join(folder: &str, name: &str) -> String {
	if folder.is_empty() {
		name.to_owned()
	} else {
		format!("{folder}/{name}")
	}
}

/// `path` written in a note of `folder`, as a path from the vault root.
fn from_root(folder: &str, path: &str) -> String {
	let mut parts: Vec<&str> = if path.starts_with('/') {
		Vec::new()
	} else {
		folder.split('/').filter(|part| !part.is_empty()).collect()
	};
	for part in path
		.split('/')
		.filter(|part| !part.is_empty() && *part != ".")
	{
		if part == ".." {
			parts.pop();
		} else {
			parts.push(part);
		}
	}
	parts.join("/")
}

/// `target` (from the vault root) written from a note of `folder`.
fn relative_to(folder: &str, target: &str) -> String {
	let base: Vec<&str> =
		folder.split('/').filter(|part| !part.is_empty()).collect();
	let goal: Vec<&str> = target.split('/').collect();
	let common = base
		.iter()
		.zip(&goal)
		.take_while(|(left, right)| left == right)
		.count();
	let mut parts = vec![".."; base.len() - common];
	parts.extend(&goal[common..]);
	parts.join("/")
}

/// New value of an image path of a note in `folder` that points into the
/// renamed `.assets` folder, keeping the absolute or relative style.
fn moved_image(
	folder: &str,
	path: &str,
	assets: (&str, &str),
) -> Option<String> {
	let (old_assets, new_assets) = assets;
	let rest = from_root(folder, path).strip_prefix(old_assets)?.to_owned();
	let target = format!("{new_assets}{rest}");
	Some(if path.starts_with('/') {
		format!("/{target}")
	} else {
		relative_to(folder, &target)
	})
}

/// The new file name for `title`, or `None` if the note keeps its name.
fn new_name(
	vault: &Vault,
	note: &str,
	title: &str,
) -> Result<Option<String>, VaultError> {
	let directory = paths::resolve(vault.root(), parent_of(note))?;
	let existing: Vec<String> = fs::read_dir(&directory)?
		.filter_map(Result::ok)
		.map(|entry| entry.file_name().to_string_lossy().into_owned())
		.collect();
	let own = note.rsplit('/').next().unwrap_or(note);
	let folder = Folder {
		existing: &existing,
		own: Some(own),
	};
	let name = format!(
		"{}.typ",
		folder.unique(&naming::base_stem(title), &NOTE_EXTENSIONS)
	);
	Ok((name != own).then_some(name))
}

/// Renames `from` to `to`, through a temporary name so that a change of
/// case works on case-insensitive file systems.
fn rename(from: &Path, to: &Path) -> Result<(), VaultError> {
	let temporary = from.with_extension("musubi-rename");
	fs::rename(from, &temporary)?;
	fs::rename(&temporary, to)?;
	Ok(())
}

fn move_files(
	vault: &Vault,
	note: &str,
	renamed: &str,
) -> Result<(), VaultError> {
	let root = vault.root();
	rename(&paths::resolve(root, note)?, &root.join(renamed))?;
	let old_assets = root.join(format!("{}{ASSETS_SUFFIX}", target_of(note)));
	if old_assets.is_dir() {
		rename(
			&old_assets,
			&root.join(format!("{}{ASSETS_SUFFIX}", target_of(renamed))),
		)?;
	}
	Ok(())
}

/// Rewrites links and image paths in every note after a renaming.
fn update_notes(
	vault: &Vault,
	renaming: &Renaming<'_>,
) -> Result<(), VaultError> {
	let old_assets = format!("{}{ASSETS_SUFFIX}", renaming.old_target);
	let new_assets = format!("{}{ASSETS_SUFFIX}", renaming.new_target);
	for entry in vault.tree()?.notes {
		let source = vault.read_note(&entry.path)?;
		let folder = parent_of(&entry.path);
		let linked = links::rewrite_links(&source, renaming);
		let current = linked.as_deref().unwrap_or(&source);
		let moved = links::rewrite_images(current, &|path| {
			moved_image(folder, path, (&old_assets, &new_assets))
		});
		if let Some(text) = moved.or(linked) {
			vault.write_note(&entry.path, &text)?;
		}
	}
	Ok(())
}

/// Saves `content` as `note`; if its title changed, renames the note and
/// updates the vault. Returns the path of the note after saving.
///
/// # Errors
///
/// Errors of [`Vault::write_note`], or an I/O error while renaming.
pub fn save_note(
	vault: &Vault,
	note: &str,
	content: &str,
) -> Result<String, VaultError> {
	let old_title = title::heading_title(&vault.read_note(note)?);
	vault.write_note(note, content)?;
	let Some(new_title) = title::heading_title(content) else {
		return Ok(note.to_owned());
	};
	if old_title.as_deref() == Some(new_title.as_str()) {
		return Ok(note.to_owned());
	}
	let Some(name) = new_name(vault, note, &new_title)? else {
		return Ok(note.to_owned());
	};
	let renamed = join(parent_of(note), &name);
	move_files(vault, note, &renamed)?;
	let old_title =
		old_title.unwrap_or_else(|| title::stem_title(target_of(note)));
	update_notes(
		vault,
		&Renaming {
			old_target: target_of(note),
			new_target: target_of(&renamed),
			old_title: &old_title,
			new_title: &new_title,
		},
	)?;
	Ok(renamed)
}

#[cfg(test)]
mod tests {
	use super::{from_root, moved_image, relative_to};

	#[test]
	fn resolves_and_writes_relative_paths() {
		assert_eq!(from_root("Maths", "../Philo/x.png"), "Philo/x.png");
		assert_eq!(from_root("Maths", "/Philo/x.png"), "Philo/x.png");
		assert_eq!(
			relative_to("Philo", "Maths/A.assets/x.png"),
			"../Maths/A.assets/x.png"
		);
	}

	#[test]
	fn moves_image_paths_into_the_new_assets_folder() {
		let assets = ("Maths/A.assets", "Maths/B.assets");
		assert_eq!(
			moved_image("Maths", "A.assets/x.png", assets).as_deref(),
			Some("B.assets/x.png")
		);
		assert_eq!(
			moved_image("", "/Maths/A.assets/x.png", assets).as_deref(),
			Some("/Maths/B.assets/x.png")
		);
		assert_eq!(moved_image("Maths", "other.png", assets), None);
	}
}
