// SPDX-License-Identifier: GPL-3.0-or-later
//! Prints the diagnostics of a note:
//! `cargo run --example diagnostics -p musubi-typst -- <vault> <note>`.

use std::env;
use std::path::PathBuf;

use musubi_typst::NoteCompiler;

fn main() {
	let mut arguments = env::args().skip(1);
	let (Some(vault), Some(note)) = (arguments.next(), arguments.next()) else {
		eprintln!("usage: diagnostics <vault> <note>");
		return;
	};
	let rendered = NoteCompiler::new(PathBuf::from(vault)).render(&note);
	for diagnostic in rendered.diagnostics {
		let line = diagnostic.position.map_or(0, |position| position.line + 1);
		println!("{line:>3} {:?} {}", diagnostic.severity, diagnostic.message);
	}
}
