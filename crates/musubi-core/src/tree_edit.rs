// SPDX-License-Identifier: GPL-3.0-or-later
//! Edits of the tree from the explorer: a note takes a new title, a note or
//! a folder moves or takes a new name. Links, images and pins follow, as
//! for a rename in the editor.

use std::fs;

use typst_syntax::{LinkedNode, SyntaxKind};

use crate::archive::{join, split};
use crate::error::VaultError;
use crate::links::Renaming;
use crate::naming::{self, Folder, NOTE_EXTENSIONS};
use crate::paths;
use crate::rename::{move_files, save_note, target_of, update_notes};
use crate::title;
use crate::vault::Vault;

/// Byte range of the first level-1 heading at the top level of `source`.
fn heading_range(source: &str) -> Option<std::ops::Range<usize>> {
	let root = typst_syntax::parse(source);
	let linked = LinkedNode::new(&root);
	let heading = linked.children().find(|node| {
		node.kind() == SyntaxKind::Heading
			&& node.children().any(|child| {
				child.kind() == SyntaxKind::HeadingMarker
					&& child.leaf_text() == "="
			})
	})?;
	Some(heading.range())
}

impl Vault {
	/// Gives the note at `note` the title `title`: its first level-1
	/// heading changes, or its file name when it has none. Returns the path
	/// of the note afterwards.
	///
	/// # Errors
	///
	/// Errors of [`save_note`], or an I/O error while renaming.
	pub fn retitle_note(
		&self,
		note: &str,
		title: &str,
	) -> Result<String, VaultError> {
		let title = title.trim();
		let source = self.read_note(note)?;
		if let Some(range) = heading_range(&source) {
			let text = format!(
				"{}= {title}{}",
				&source[..range.start],
				&source[range.end..]
			);
			return save_note(self, note, &text);
		}
		self.rename_file(note, title)
	}

	/// A note without heading takes its title from its file name: the file
	/// takes the name of `title`.
	fn rename_file(
		&self,
		note: &str,
		title: &str,
	) -> Result<String, VaultError> {
		let (folder, name) = split(note);
		let existing = self.names_in_folder(folder)?;
		let names = Folder {
			existing: &existing,
			own: Some(name),
		};
		let stem = names.unique(&naming::base_stem(title), &NOTE_EXTENSIONS);
		let moved = join(folder, &format!("{stem}.typ"));
		if moved == note {
			return Ok(moved);
		}
		move_files(self, note, &moved)?;
		self.rename_pin(note, &moved)?;
		update_notes(
			self,
			&Renaming {
				old_target: target_of(note),
				new_target: target_of(&moved),
				old_title: &title::stem_title(target_of(name)),
				new_title: &title::stem_title(&stem),
			},
		)?;
		Ok(moved)
	}

	fn names_in_folder(&self, folder: &str) -> Result<Vec<String>, VaultError> {
		Ok(fs::read_dir(paths::resolve(self.root(), folder)?)?
			.filter_map(Result::ok)
			.map(|entry| entry.file_name().to_string_lossy().into_owned())
			.collect())
	}

	/// Moves the note or folder at `path` to `to`, the path it should
	/// take. A note keeps its file name: only the folder of `to` counts. A
	/// folder is named from the last part of `to`. A free name is taken on
	/// a collision. Returns the new path.
	///
	/// # Errors
	///
	/// [`VaultError::IntoItself`] for a folder moved into itself, a missing
	/// path, a read-only vault, or an I/O error.
	pub fn move_entry(
		&self,
		path: &str,
		to: &str,
	) -> Result<String, VaultError> {
		let (folder, name) = split(to);
		let target = if path.ends_with(".typ") {
			join(folder, split(path).1)
		} else {
			join(folder, &naming::folder_stem(name))
		};
		if target == path {
			return Ok(target);
		}
		self.relocate(path, &target)
	}
}

#[cfg(test)]
mod tests {
	use super::heading_range;

	#[test]
	fn finds_the_first_level_one_heading() {
		let source = "#import \"x\": y\n== Intro\n= Title *here*\nText\n";
		let range = heading_range(source).expect("heading");
		assert_eq!(&source[range], "= Title *here*");
		assert_eq!(heading_range("Text only\n"), None);
	}
}
