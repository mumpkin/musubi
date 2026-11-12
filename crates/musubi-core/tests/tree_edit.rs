// SPDX-License-Identifier: GPL-3.0-or-later
//! Edits of the tree from the explorer: new titles, moves and new names of
//! notes and folders, links and pins following.

use std::fs;

use musubi_core::Vault;
use tempfile::TempDir;

fn vault_with(files: &[(&str, &str)]) -> (TempDir, Vault) {
	let directory = TempDir::new().expect("temporary directory");
	for (path, content) in files {
		let file = directory.path().join(path);
		if let Some(parent) = file.parent() {
			fs::create_dir_all(parent).expect("folder");
		}
		fs::write(file, content).expect("file");
	}
	let vault = Vault::open(directory.path()).expect("vault opens");
	(directory, vault)
}

const HOME: &str = "#import \"@local/musubi:0.1.0\": note-link\n= Home\n\
	#note-link(\"Maths/Analyse\")[Analyse] #note-link(\"Draft\")[Draft]\n";

#[test]
fn retitles_a_note_by_its_heading() {
	let (_directory, vault) = vault_with(&[
		("Home.typ", HOME),
		("Maths/Analyse.typ", "Intro\n= Analyse\nText\n"),
	]);
	vault.pin("Maths/Analyse.typ", true).expect("pinned");
	let renamed = vault
		.retitle_note("Maths/Analyse.typ", "Real analysis")
		.expect("retitled");
	assert_eq!(renamed, "Maths/Real_analysis.typ");
	assert_eq!(
		vault.read_note(&renamed).expect("note"),
		"Intro\n= Real analysis\nText\n"
	);
	let home = vault.read_note("Home.typ").expect("home");
	assert!(
		home.contains("#note-link(\"Maths/Real_analysis\")[Real analysis]"),
		"{home}"
	);
	assert_eq!(vault.pinned(), ["Maths/Real_analysis.typ"]);
}

#[test]
fn retitles_a_note_without_heading_by_its_file_name() {
	let (_directory, vault) =
		vault_with(&[("Home.typ", HOME), ("Draft.typ", "Just text\n")]);
	let renamed = vault.retitle_note("Draft.typ", "Plan B").expect("retitled");
	assert_eq!(renamed, "Plan_B.typ");
	assert_eq!(vault.read_note(&renamed).expect("note"), "Just text\n");
	let home = vault.read_note("Home.typ").expect("home");
	assert!(home.contains("#note-link(\"Plan_B\")[Plan B]"), "{home}");
}

#[test]
fn moves_a_note_and_renames_a_folder() {
	let (_directory, vault) = vault_with(&[
		("Home.typ", HOME),
		("Maths/Analyse.typ", "= Analyse\n"),
		("Physics/Waves.typ", "= Waves\n"),
	]);
	let moved = vault
		.move_entry("Maths/Analyse.typ", "Physics/Analyse.typ")
		.expect("moved");
	assert_eq!(moved, "Physics/Analyse.typ");
	let renamed = vault
		.move_entry("Physics", "Science notes")
		.expect("renamed");
	assert_eq!(renamed, "Science notes");
	let home = vault.read_note("Home.typ").expect("home");
	assert!(home.contains("\"Science notes/Analyse\""), "{home}");
	assert!(vault.read_note("Science notes/Waves.typ").is_ok());
}

#[test]
fn keeps_a_folder_name_that_only_changes_case() {
	let (_directory, vault) = vault_with(&[("maths/A.typ", "= A\n")]);
	let renamed = vault.move_entry("maths", "Maths").expect("renamed");
	assert_eq!(renamed, "Maths");
	assert!(vault.read_note("Maths/A.typ").is_ok());
}

#[test]
fn refuses_to_move_a_folder_into_itself() {
	let (_directory, vault) = vault_with(&[("A/B/Note.typ", "= Note\n")]);
	assert!(vault.move_entry("A", "A/B/A").is_err());
	assert!(vault.read_note("A/B/Note.typ").is_ok());
}
