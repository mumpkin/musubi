// SPDX-License-Identifier: GPL-3.0-or-later
//! The entry point of a compilation: a virtual file that includes the note
//! after show rules for what the HTML export of Typst drops (shapes,
//! transforms, placement, grids). Those render as SVG islands with
//! `html.frame` instead of disappearing. The note itself is unchanged and
//! still compiles alone.

use typst::syntax::{FileId, Source, VirtualPath};

/// Not a valid note name: it starts with `.`, so it never clashes with a
/// file of the vault.
const ENTRY_PATH: &str = "/.musubi-entry.typ";

/// Elements that the HTML export ignores, rendered as SVG.
const FRAMED: [&str; 16] = [
	"rect", "square", "circle", "ellipse", "line", "polygon", "curve", "grid",
	"rotate", "scale", "skew", "move", "place", "stack", "columns", "repeat",
];

/// The width of the column of the reading view (`46rem` there, and an SVG
/// island measures `1em` per `11pt`, the default text size).
const COLUMN_WIDTH: &str = "506pt";

/// Lays an island out at the width of the column, so that `fr`, `%` and
/// `columns` have room, but no wider than its content needs: a small shape
/// keeps its size.
const ISLAND: &str = "it => context html.frame(block(
  width: measure(it, width: COLUMN).width,
  it,
))";

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
	let island = ISLAND.replace("COLUMN", COLUMN_WIDTH);
	let mut text = format!("#let musubi-island = {island}\n");
	text.extend(
		FRAMED
			.iter()
			.map(|element| format!("#show {element}: musubi-island\n")),
	);
	// The alignment is lost, but the content stays.
	text.push_str("#show align: it => it.body\n");
	text.push_str(&format!("#include {}\n", quoted(note)));
	Source::new(id, text)
}
