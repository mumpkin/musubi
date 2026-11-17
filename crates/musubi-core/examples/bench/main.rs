// SPDX-License-Identifier: GPL-3.0-or-later
//! Times what the app asks of the core on generated vaults of growing size:
//! `cargo run --release -p musubi-core --example bench [-- 100 1000 5000]`.
//!
//! `-- --write <folder> <notes>` only writes a vault, to open in the app.

mod generate;

use std::env;
use std::path::Path;
use std::time::Instant;

use musubi_core::{Vault, VaultIndex, save_note, search_titles};
use musubi_typst::NoteCompiler;

const SIZES: [usize; 3] = [100, 1000, 5000];
const SEED: u64 = 0x5eed_6d75_7375_6269;
const RUNS: u32 = 5;
const MILLISECONDS_PER_SECOND: f64 = 1000.0;

type Outcome = Result<(), Box<dyn std::error::Error>>;

/// Average duration of `runs` calls of `action`, printed as a table row.
fn time(
	label: &str,
	runs: u32,
	mut action: impl FnMut() -> Outcome,
) -> Outcome {
	let start = Instant::now();
	for _ in 0..runs {
		action()?;
	}
	let milliseconds = start.elapsed().as_secs_f64() * MILLISECONDS_PER_SECOND
		/ f64::from(runs);
	println!("| {label:<40} | {milliseconds:>10.1} |");
	Ok(())
}

struct Bench {
	vault: Vault,
	index: VaultIndex,
	compiler: NoteCompiler,
	notes: Vec<String>,
}

impl Bench {
	fn open(
		root: &Path,
		notes: Vec<String>,
	) -> Result<Self, Box<dyn std::error::Error>> {
		let vault = Vault::open(root)?;
		let mut compiler = NoteCompiler::new(root.to_path_buf());
		let mut index = VaultIndex::in_memory()?;
		time("open: index every note (cold)", 1, || {
			index
				.refresh(&vault, &mut compiler)
				.map(|_| ())
				.map_err(Into::into)
		})?;
		Ok(Self {
			vault,
			index,
			compiler,
			notes,
		})
	}

	fn commands(&mut self) -> Outcome {
		let Self {
			vault,
			index,
			compiler,
			notes,
		} = self;
		time("refresh with nothing changed", RUNS, || {
			index
				.refresh(vault, compiler)
				.map(|_| ())
				.map_err(Into::into)
		})?;
		time("vault_tree (refresh + tree)", RUNS, || {
			index.refresh(vault, compiler)?;
			vault.tree().map(|_| ()).map_err(Into::into)
		})?;
		time("search_notes, one keystroke", RUNS, || {
			let indexed = index.notes()?;
			let _matches = search_titles(&indexed, "note 4");
			Ok(())
		})?;
		time("search_text", RUNS, || {
			index
				.search_text("dolor magna")
				.map(|_| ())
				.map_err(Into::into)
		})?;
		time("backlinks of the most linked note", RUNS, || {
			if index.backlinks(&notes[0])?.is_empty() {
				return Err("the most linked note has no backlinks".into());
			}
			Ok(())
		})?;
		time("vault_graph", RUNS, || {
			index.graph().map(|_| ()).map_err(Into::into)
		})
	}

	fn edits(&mut self) -> Outcome {
		let Self {
			vault,
			index,
			compiler,
			notes,
		} = self;
		let note = notes[notes.len() / 2].clone();
		let source = vault.read_note(&note)?;
		let mut round = 0;
		time("write_note (save + refresh)", RUNS, || {
			round += 1;
			let text = format!("{source}\nEdit {round}.\n");
			save_note(vault, &note, &text)?;
			index
				.refresh(vault, compiler)
				.map(|_| ())
				.map_err(Into::into)
		})?;
		time("render_note, next compilations", RUNS, || {
			compiler.render(&note);
			Ok(())
		})
	}
}

fn run(notes: usize) -> Outcome {
	let folder = tempfile::tempdir()?;
	let paths = generate::vault(folder.path(), notes, SEED)?;
	println!("\n### {notes} notes\n");
	println!("| {:<40} | {:>10} |", "operation", "ms");
	println!("| {:-<40} | {:->10} |", "", "");
	let mut bench = Bench::open(folder.path(), paths)?;
	bench.commands()?;
	bench.edits()
}

fn main() -> Outcome {
	let arguments: Vec<String> = env::args().skip(1).collect();
	if let [flag, folder, notes] = arguments.as_slice()
		&& flag == "--write"
	{
		generate::vault(Path::new(folder), notes.parse()?, SEED)?;
		return Ok(());
	}
	let sizes: Vec<usize> = if arguments.is_empty() {
		SIZES.to_vec()
	} else {
		arguments
			.iter()
			.map(|size| size.parse())
			.collect::<Result<_, _>>()?
	};
	sizes.into_iter().try_for_each(run)
}
