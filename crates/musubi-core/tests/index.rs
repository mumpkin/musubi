// SPDX-License-Identifier: GPL-3.0-or-later
//! The link index: backlinks, refresh after changes, rebuild.

use std::fs;
use std::path::Path;

use musubi_core::{Backlink, Vault, VaultIndex};
use musubi_typst::NoteCompiler;
use tempfile::TempDir;

const IMPORT: &str = "#import \"@local/musubi:0.1.0\": note-link\n";

fn vault_with(files: &[(&str, &str)]) -> TempDir {
	let directory = TempDir::new().expect("temporary directory");
	for (path, content) in files {
		write(directory.path(), path, content);
	}
	directory
}

fn write(root: &Path, path: &str, content: &str) {
	let file = root.join(path);
	if let Some(parent) = file.parent() {
		fs::create_dir_all(parent).expect("folder");
	}
	fs::write(file, format!("{IMPORT}{content}")).expect("file");
}

struct Setup {
	vault: Vault,
	compiler: NoteCompiler,
	index: VaultIndex,
}

impl Setup {
	fn new(root: &Path, index: VaultIndex) -> Self {
		let vault = Vault::open(root).expect("vault opens");
		let compiler = NoteCompiler::new(vault.root().to_path_buf());
		Self {
			vault,
			compiler,
			index,
		}
	}

	fn refresh(&mut self) -> usize {
		self.index
			.refresh(&self.vault, &mut self.compiler)
			.expect("index refreshes")
	}

	fn sources_of(&self, note: &str) -> Vec<String> {
		self.index
			.backlinks(note)
			.expect("backlinks")
			.into_iter()
			.map(|backlink| backlink.path)
			.collect()
	}
}

fn demo() -> TempDir {
	vault_with(&[
		("Target.typ", "= Target\n"),
		(
			"Maths/Analyse.typ",
			"= Analyse\nIntro. Read #note-link(\"Target\")[the target] \
			 first.\n\nAnd #note-link(\"Target\", section: \"S\")[its part].",
		),
		("Philo/Kant.typ", "= Kant\n#note-link(\"Target\")[Target]"),
		("Self.typ", "= Self\n#note-link(\"Self\")[me]"),
	])
}

#[test]
fn lists_the_notes_linking_to_a_note_with_their_sentence() {
	let directory = demo();
	let mut setup =
		Setup::new(directory.path(), VaultIndex::in_memory().expect("index"));
	assert_eq!(setup.refresh(), 4);
	let backlinks = setup.index.backlinks("Target.typ").expect("backlinks");
	assert_eq!(
		backlinks,
		vec![
			Backlink {
				path: "Maths/Analyse.typ".into(),
				title: "Analyse".into(),
				section: None,
				context: "Read the target first.".into(),
			},
			Backlink {
				path: "Maths/Analyse.typ".into(),
				title: "Analyse".into(),
				section: Some("S".into()),
				context: "And its part.".into(),
			},
			Backlink {
				path: "Philo/Kant.typ".into(),
				title: "Kant".into(),
				section: None,
				context: "Target".into(),
			},
		],
	);
	assert!(setup.sources_of("Self.typ").is_empty(), "no self backlink");
}

#[test]
fn indexes_only_changed_notes_and_forgets_deleted_ones() {
	let directory = demo();
	let mut setup =
		Setup::new(directory.path(), VaultIndex::in_memory().expect("index"));
	setup.refresh();
	assert_eq!(setup.refresh(), 0);
	write(
		directory.path(),
		"Philo/Kant.typ",
		"= Kant\nNo link any more.",
	);
	fs::remove_file(directory.path().join("Maths/Analyse.typ"))
		.expect("note removed");
	assert_eq!(setup.refresh(), 1);
	assert!(setup.sources_of("Target.typ").is_empty());
}

#[test]
fn rebuilds_a_deleted_or_broken_index_file() {
	let directory = demo();
	let data = TempDir::new().expect("data directory");
	let file = VaultIndex::file_for(data.path(), directory.path());
	let mut setup = Setup::new(
		directory.path(),
		VaultIndex::open(&file).expect("index opens"),
	);
	setup.refresh();
	drop(setup);
	let mut reopened =
		Setup::new(directory.path(), VaultIndex::open(&file).expect("index"));
	assert_eq!(reopened.refresh(), 0, "the index was kept");
	drop(reopened);
	fs::write(&file, "not a database").expect("broken file");
	let mut rebuilt =
		Setup::new(directory.path(), VaultIndex::open(&file).expect("index"));
	assert_eq!(rebuilt.refresh(), 4);
	assert_eq!(rebuilt.sources_of("Target.typ").len(), 3);
}

#[test]
fn creates_the_note_of_a_missing_link_at_its_path() {
	let directory = vault_with(&[]);
	let vault = Vault::open(directory.path()).expect("vault opens");
	vault
		.create_note_at("Maths/Missing_note.typ", "Missing note")
		.expect("note created");
	assert_eq!(
		vault.read_note("Maths/Missing_note.typ").expect("note"),
		"= Missing note\n"
	);
	assert!(
		vault
			.create_note_at("Maths/Missing_note.typ", "Again")
			.is_err()
	);
	assert!(vault.create_note_at("../outside.typ", "Out").is_err());
}

#[test]
fn finds_text_without_accents_with_highlighted_excerpts() {
	let directory = vault_with(&[
		(
			"Maths/Analyse.typ",
			"= Analyse\n\n== Intégrales\n\nAire sous la courbe.",
		),
		("Other.typ", "= Other\n\nNothing about it."),
	]);
	let mut setup =
		Setup::new(directory.path(), VaultIndex::in_memory().expect("index"));
	setup.refresh();
	let found = setup.index.search_text("integrale").expect("search");
	assert_eq!(found.len(), 1);
	let first = &found[0];
	assert_eq!(first.path, "Maths/Analyse.typ");
	assert_eq!(first.title, "Analyse");
	assert_eq!(first.line, 3, "the line of the heading");
	assert_eq!(first.excerpt, "\u{E000}Intégrales\u{E001}");
	assert!(
		setup
			.index
			.search_text("courbe aire")
			.expect("search")
			.len() == 1
	);
	assert!(setup.index.search_text("  ").expect("search").is_empty());
}

#[test]
fn builds_the_graph_of_existing_notes() {
	let directory = demo();
	let mut setup =
		Setup::new(directory.path(), VaultIndex::in_memory().expect("index"));
	setup.refresh();
	write(
		directory.path(),
		"Lonely.typ",
		"= Lonely\n#note-link(\"Gone\")[x]",
	);
	setup.refresh();
	let graph = setup.index.graph().expect("graph");
	let mut titles: Vec<&str> =
		graph.nodes.iter().map(|node| node.title.as_str()).collect();
	titles.sort_unstable();
	assert_eq!(titles, ["Analyse", "Kant", "Lonely", "Self", "Target"]);
	let mut links: Vec<(&str, &str)> = graph
		.links
		.iter()
		.map(|link| {
			let at = |index: u32| graph.nodes[index as usize].title.as_str();
			(at(link.source), at(link.target))
		})
		.collect();
	links.sort_unstable();
	assert_eq!(links, [("Analyse", "Target"), ("Kant", "Target")]);
}
