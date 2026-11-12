// SPDX-License-Identifier: GPL-3.0-or-later
//! The tutorial: installed without overwriting, and every note compiles
//! cleanly, with links that all lead to existing notes but one.

use std::fs;

use musubi_core::{Vault, VaultIndex};
use musubi_typst::NoteCompiler;
use tempfile::TempDir;

/// Titles of the tutorial notes, by path, once `Start_here.typ` is mine.
const TITLES: [&str; 9] = [
	"Find anything",
	"Helix basics",
	"Helix workshop",
	"Pins and themes",
	"Mine",
	"The lighthouse",
	"Typst basics",
	"Using Musubi",
	"Writing Typst",
];

#[test]
fn installs_the_missing_files_only() {
	let directory = TempDir::new().expect("temporary directory");
	let vault = Vault::open(directory.path()).expect("vault opens");
	fs::create_dir_all(directory.path().join("Welcome")).expect("folder");
	fs::write(directory.path().join("Welcome/Start_here.typ"), "= Mine\n")
		.expect("note");
	assert_eq!(
		vault.install_tutorial().expect("installed"),
		"Welcome/Start_here.typ"
	);
	assert_eq!(
		vault.read_note("Welcome/Start_here.typ").expect("note"),
		"= Mine\n",
		"an existing note is kept"
	);
	let titles: Vec<String> = vault
		.tree()
		.expect("tree")
		.notes
		.into_iter()
		.map(|note| note.title)
		.collect();
	assert_eq!(titles, TITLES);
	assert!(
		directory
			.path()
			.join("Welcome/Typst_basics.assets/musubi.svg")
			.is_file()
	);
}

#[test]
fn every_note_compiles_without_warnings_and_links_to_existing_notes() {
	let directory = TempDir::new().expect("temporary directory");
	let vault = Vault::open(directory.path()).expect("vault opens");
	vault.install_tutorial().expect("installed");
	let mut compiler = NoteCompiler::new(vault.root().to_path_buf());
	for note in vault.tree().expect("tree").notes {
		let rendered = compiler.render(&note.path);
		assert!(rendered.html.is_some(), "{} compiles", note.path);
		assert!(
			rendered.diagnostics.is_empty(),
			"{}: {:?}",
			note.path,
			rendered.diagnostics
		);
	}
	let mut index = VaultIndex::in_memory().expect("index");
	index.refresh(&vault, &mut compiler).expect("indexed");
	let graph = index.graph().expect("graph");
	assert_eq!(graph.nodes.len(), 9);
	assert!(graph.links.len() >= 8, "the notes link to each other");
}
