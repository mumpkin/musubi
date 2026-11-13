// SPDX-License-Identifier: GPL-3.0-or-later
//! Links to a note in the trash become their text, and come back when the
//! note is restored.

use std::fs;

use musubi_core::Vault;
use tempfile::TempDir;

const DELETED_AT: i64 = 1_794_319_402;
const HOME: &str = "#import \"@local/musubi:0.1.0\": note-link\n= Home\n\
	See #note-link(\"Maths/A\")[the *A* note], \
	#note-link(\"Maths/B\")[B] and #note-link(\"Other\")[other].\n";

fn vault_with(files: &[(&str, &str)]) -> (TempDir, Vault) {
	let directory = TempDir::new().expect("temporary directory");
	for (path, content) in files {
		let file = directory.path().join(path);
		fs::create_dir_all(file.parent().expect("parent")).expect("folder");
		fs::write(file, content).expect("file");
	}
	let vault = Vault::open(directory.path()).expect("vault opens");
	(directory, vault)
}

fn files() -> [(&'static str, &'static str); 4] {
	[
		("Home.typ", HOME),
		("Maths/A.typ", "= A\n"),
		("Maths/B.typ", "= B\n#note-link(\"Maths/A\")[A]\n"),
		("Other.typ", "= Other\n"),
	]
}

#[test]
fn turns_links_into_text_and_back_byte_for_byte() {
	let (_directory, vault) = vault_with(&files());
	let entry = vault
		.trash_note("Maths/A.typ", DELETED_AT)
		.expect("trashed");
	let home = vault.read_note("Home.typ").expect("home");
	assert!(
		home.contains("See the *A* note, #note-link(\"Maths/B\")"),
		"{home}"
	);
	assert_eq!(vault.read_note("Maths/B.typ").expect("B"), "= B\nA\n");
	vault.restore(&entry.id).expect("restored");
	assert_eq!(vault.read_note("Home.typ").expect("home"), HOME);
	assert_eq!(
		vault.read_note("Maths/B.typ").expect("B"),
		"= B\n#note-link(\"Maths/A\")[A]\n"
	);
}

#[test]
fn keeps_an_edited_text_as_text() {
	let (_directory, vault) = vault_with(&files());
	let entry = vault
		.trash_note("Maths/A.typ", DELETED_AT)
		.expect("trashed");
	let home = vault.read_note("Home.typ").expect("home");
	vault
		.write_note("Home.typ", &home.replace("the *A* note", "a note"))
		.expect("edited");
	vault.restore(&entry.id).expect("restored");
	let restored = vault.read_note("Home.typ").expect("home");
	assert!(
		restored.contains("See a note, #note-link(\"Maths/B\")"),
		"{restored}"
	);
}

#[test]
fn unlinks_a_whole_folder_but_not_links_inside_it() {
	let (_directory, vault) = vault_with(&files());
	let entry = vault.trash_folder("Maths", DELETED_AT).expect("trashed");
	let home = vault.read_note("Home.typ").expect("home");
	assert!(home.contains("See the *A* note, B and #note-link(\"Other\")"));
	vault.restore(&entry.id).expect("restored");
	assert_eq!(vault.read_note("Home.typ").expect("home"), HOME);
	assert_eq!(
		vault.read_note("Maths/B.typ").expect("B"),
		"= B\n#note-link(\"Maths/A\")[A]\n"
	);
}

#[test]
fn points_the_links_to_a_note_restored_under_a_new_name() {
	let (_directory, vault) = vault_with(&files());
	let entry = vault
		.trash_note("Maths/A.typ", DELETED_AT)
		.expect("trashed");
	fs::write(vault.root().join("Maths/A.typ"), "= Taken\n").expect("taken");
	let restored = vault.restore(&entry.id).expect("restored");
	assert_eq!(restored, "Maths/A_2.typ");
	let home = vault.read_note("Home.typ").expect("home");
	assert!(
		home.contains("#note-link(\"Maths/A_2\")[the *A* note]"),
		"{home}"
	);
}

#[test]
fn forgets_the_links_of_an_entry_deleted_for_good() {
	let (_directory, vault) = vault_with(&files());
	let entry = vault
		.trash_note("Maths/A.typ", DELETED_AT)
		.expect("trashed");
	vault.delete_trash_entry(&entry.id).expect("deleted");
	let home = vault.read_note("Home.typ").expect("home");
	assert!(home.contains("See the *A* note,"), "{home}");
}
