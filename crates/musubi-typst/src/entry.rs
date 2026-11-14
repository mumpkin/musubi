// SPDX-License-Identifier: GPL-3.0-or-later
//! The entry point of a compilation: a virtual file that includes the note
//! after show rules for what the HTML export of Typst drops (shapes,
//! transforms, placement, grids, the look of blocks). The rules are in
//! `entry.typ`. The note itself is unchanged and still compiles alone.

use typst::syntax::{FileId, Source, VirtualPath};

/// Not a valid note name: it starts with `.`, so it never clashes with a
/// file of the vault.
const ENTRY_PATH: &str = "/.musubi-entry.typ";

/// The functions the show rules use.
const RULES: &str = include_str!("entry.typ");

/// Elements that the HTML export ignores, rendered as SVG.
const FRAMED: [&str; 16] = [
	"rect", "square", "circle", "ellipse", "line", "polygon", "curve", "grid",
	"rotate", "scale", "skew", "move", "place", "stack", "columns", "repeat",
];

/// Show rules after `RULES`: blocks, boxes and text keep their look, lists
/// their numbering.
const STYLED: &str = "#show block: musubi-styled(\"div\", false)
#show box: musubi-styled(\"span\", true)
#show align: musubi-unaligned
#show heading: musubi-base
#show raw: musubi-base
#show footnote.entry: musubi-base
#show text: musubi-styled-text
#show enum: musubi-numbered
";

pub fn entry_path() -> VirtualPath {
	VirtualPath::new(ENTRY_PATH)
		.unwrap_or_else(|_| unreachable!("the entry path is a valid path"))
}

fn quoted(path: &str) -> String {
	format!("\"{}\"", path.replace('\\', "\\\\").replace('"', "\\\""))
}

/// The entry point for the note at `note` (a virtual path from the vault
/// root); empty before a note is selected.
pub fn entry_source(id: FileId, note: &str) -> Source {
	if note.is_empty() {
		return Source::new(id, String::new());
	}
	let mut text = format!("{RULES}\n");
	text.extend(
		FRAMED
			.iter()
			.map(|element| format!("#show {element}: musubi-framed\n")),
	);
	text.push_str(STYLED);
	text.push_str(&format!("#include {}\n", quoted(note)));
	Source::new(id, text)
}
