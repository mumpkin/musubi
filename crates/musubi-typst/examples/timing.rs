// SPDX-License-Identifier: GPL-3.0-or-later
//! Measures compilation times on the demo vault:
//! `cargo run --release --example timing -p musubi-typst`.

use std::fs;
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};

use musubi_typst::NoteCompiler;

const NOTE: &str = "Demo.typ";
const RUNS: u32 = 20;

fn measure<T>(label: &str, runs: u32, mut action: impl FnMut() -> T) -> Vec<T> {
	let start = Instant::now();
	let results = (0..runs).map(|_| action()).collect::<Vec<T>>();
	let average: Duration = start.elapsed() / runs;
	println!("{label:<36} {average:?}");
	results
}

fn main() {
	let vault = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
		.join("../../examples/demo-vault");
	let mut compilers = measure("create the compiler", 1, || {
		NoteCompiler::new(vault.clone())
	});
	let Some(compiler) = compilers.first_mut() else {
		return;
	};
	measure("first compilation", 1, || compiler.render(NOTE));
	measure("next compilations (average)", RUNS, || {
		compiler.render(NOTE)
	});
	measure("another note, first time", 1, || {
		compiler.render("Maths/Analyse.typ")
	});
	measure_edits(&vault);
}

/// Compiles a copy of the demo note after each edit, like a save in the
/// editor.
fn measure_edits(vault: &Path) {
	let edited_vault = std::env::temp_dir().join("musubi-timing");
	fs::create_dir_all(&edited_vault).expect("temporary vault");
	let mut source =
		fs::read_to_string(vault.join(NOTE)).expect("demo note readable");
	fs::write(edited_vault.join(NOTE), &source).expect("note written");
	let mut compiler = NoteCompiler::new(edited_vault.clone());
	compiler.render(NOTE);
	measure("compilation after an edit (average)", RUNS, || {
		source.push_str("\nOne more paragraph.\n");
		fs::write(edited_vault.join(NOTE), &source).expect("note written");
		compiler.render(NOTE)
	});
}
