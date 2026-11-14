// SPDX-License-Identifier: GPL-3.0-or-later
//! Notes that import a package Musubi cannot load (it works offline) still
//! show. In a copy of the note, each top-level element whose compilation
//! fails, the import and then what uses the package, is replaced by a
//! notice followed by its own source. Positions in the copy map back to the
//! note, so that blocks and diagnostics keep pointing at the right place.

use std::ops::Range;

use typst::syntax::{Source, SyntaxKind};

const MISSING_PACKAGE: &str = "package not found (searched for ";
const NOTICE_CLASS: &str = "musubi-unavailable";
/// What replaces an element that uses a package that is not available.
const DEPENDENT_NOTICE: &str =
	"This part needs a package that is not available offline.";

/// The package of a "package not found" error, such as
/// `@preview/cetz:0.3.4`.
pub fn missing_package(message: &str) -> Option<&str> {
	message.strip_prefix(MISSING_PACKAGE)?.strip_suffix(')')
}

/// The notice for an element: about `package` for its import, else about
/// a part that depends on a missing package.
pub fn notice(package: Option<&str>) -> String {
	package.map_or_else(
		|| DEPENDENT_NOTICE.to_owned(),
		|package| {
			format!(
				"The package {package} is not available: Musubi works \
				 offline, so the note shows without it."
			)
		},
	)
}

/// A Typst string literal holding `text`.
fn string_literal(text: &str) -> String {
	let escaped = text
		.replace('\\', "\\\\")
		.replace('"', "\\\"")
		.replace('\n', "\\n")
		.replace('\r', "\\r");
	format!("\"{escaped}\"")
}

/// Markup that shows `message` and the source of the replaced element.
fn notice_markup(message: &str, source: &str) -> String {
	format!(
		"#html.elem(\"div\", attrs: (class: \"{NOTICE_CLASS}\"), \
		 html.elem(\"p\", [#{}]) + raw({}, block: true, lang: \"typ\"))",
		string_literal(message),
		string_literal(source),
	)
}

/// The top-level element of `source` that contains `byte`, with the `#`
/// that introduces it.
pub fn element_at(source: &Source, byte: usize) -> Option<Range<usize>> {
	let mut offset = 0;
	let mut hash_start = None;
	for node in source.root().children() {
		let range = offset..offset + node.len();
		offset = range.end;
		if node.kind() == SyntaxKind::Hash {
			hash_start = Some(range.start);
			if range.contains(&byte) {
				continue;
			}
		} else if range.contains(&byte) || hash_start == Some(byte) {
			return Some(hash_start.unwrap_or(range.start)..range.end);
		} else {
			hash_start = None;
		}
	}
	None
}

struct Patch {
	/// Bytes of the note that are replaced.
	range: Range<usize>,
	replacement: String,
}

/// A note with elements replaced by notices.
pub struct PatchedNote {
	original: Source,
	/// Sorted by position, without overlap.
	patches: Vec<Patch>,
}

impl PatchedNote {
	pub const fn new(original: Source) -> Self {
		Self {
			original,
			patches: Vec::new(),
		}
	}

	/// Replaces the element at `range` of the note by a notice with
	/// `message`; `false` if it is already replaced.
	pub fn replace(&mut self, range: Range<usize>, message: &str) -> bool {
		let overlaps = self.patches.iter().any(|patch| {
			patch.range.start < range.end && range.start < patch.range.end
		});
		let Some(source) = self.original.text().get(range.clone()) else {
			return false;
		};
		if overlaps {
			return false;
		}
		let replacement = notice_markup(message, source);
		let index = self
			.patches
			.partition_point(|patch| patch.range.start < range.start);
		self.patches.insert(index, Patch { range, replacement });
		true
	}

	/// The text of the note with its patches.
	pub fn text(&self) -> String {
		let original = self.original.text();
		let mut text = String::with_capacity(original.len());
		let mut copied = 0;
		for patch in &self.patches {
			text.push_str(&original[copied..patch.range.start]);
			text.push_str(&patch.replacement);
			copied = patch.range.end;
		}
		text.push_str(&original[copied..]);
		text
	}

	/// The byte of the note that `byte` of the patched text comes from; a
	/// byte of a notice comes from the start of the element it replaces.
	pub fn to_original(&self, byte: usize) -> usize {
		let mut shift: isize = 0;
		for patch in &self.patches {
			let start = patch.range.start.saturating_add_signed(shift);
			if byte < start {
				break;
			}
			if byte < start + patch.replacement.len() {
				return patch.range.start;
			}
			shift += length_change(patch);
		}
		byte.saturating_add_signed(-shift)
	}
}

/// How much longer the replacement of `patch` is than what it replaces.
fn length_change(patch: &Patch) -> isize {
	let replacement = isize::try_from(patch.replacement.len());
	let replaced = isize::try_from(patch.range.len());
	match (replacement, replaced) {
		(Ok(replacement), Ok(replaced)) => replacement - replaced,
		_ => 0,
	}
}

#[cfg(test)]
mod tests {
	use typst::syntax::Source;

	use super::{PatchedNote, element_at, missing_package};

	#[test]
	fn reads_the_missing_package() {
		assert_eq!(
			missing_package(
				"package not found (searched for @preview/a:1.0.0)"
			),
			Some("@preview/a:1.0.0"),
		);
		assert_eq!(missing_package("unknown variable: x"), None);
	}

	#[test]
	fn finds_the_element_with_its_hash() {
		let source = Source::detached("#import \"x\"\n#f(1) text");
		let call = source.text().find("f(1)").unwrap_or_default();
		assert_eq!(element_at(&source, call + 2), Some(call - 1..call + 4));
		assert_eq!(element_at(&source, call - 1), Some(call - 1..call + 4));
	}

	#[test]
	fn maps_positions_back_to_the_note() {
		let source = Source::detached("ab #f() cd");
		let mut note = PatchedNote::new(source);
		assert!(note.replace(3..7, "gone"));
		assert!(!note.replace(4..6, "again"));
		let text = note.text();
		assert!(text.starts_with("ab #html.elem("));
		let after = text.find(" cd").unwrap_or_default();
		assert_eq!(note.to_original(after), 7);
		assert_eq!(note.to_original(1), 1);
		assert_eq!(note.to_original(5), 3);
	}
}
