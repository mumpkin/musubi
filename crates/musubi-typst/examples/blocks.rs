// SPDX-License-Identifier: GPL-3.0-or-later
//! Prints the blocks of a note and the rendered elements that point to
//! them: `cargo run --example blocks -p musubi-typst -- <vault> <note>`.

use std::env;
use std::path::PathBuf;

use musubi_typst::NoteCompiler;

fn main() {
	let mut arguments = env::args().skip(1);
	let (Some(vault), Some(note)) = (arguments.next(), arguments.next()) else {
		eprintln!("usage: blocks <vault> <note>");
		return;
	};
	let rendered = NoteCompiler::new(PathBuf::from(vault)).render(&note);
	for (index, block) in rendered.blocks.iter().enumerate() {
		println!(
			"{index:>2} {:<10} lines {}-{}",
			format!("{:?}", block.kind),
			block.start_line + 1,
			block.end_line + 1,
		);
	}
	println!("{}", rendered.html.unwrap_or_default());
}
