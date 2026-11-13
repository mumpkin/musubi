// SPDX-License-Identifier: GPL-3.0-or-later
//! Conflict copies of sync tools: listed apart from the notes, resolved by
//! keeping one version, the other in the trash.

use std::fs;

use musubi_core::{Keep, Vault};
use tempfile::TempDir;

const COPY: &str = "Maths/A.sync-conflict-20261113-101500-ABCDEFG.typ";

fn vault() -> (TempDir, Vault) {
	let directory = TempDir::new().expect("temporary directory");
	let root = directory.path();
	fs::create_dir_all(root.join("Maths")).expect("folder");
	fs::write(root.join("Maths/A.typ"), "= A\nMine\n").expect("note");
	fs::write(root.join(COPY), "= A\nTheirs\n").expect("copy");
	fs::write(
		root.join("B (conflicted copy 2026-11-13 101500).typ"),
		"= B\n",
	)
	.expect("copy");
	let vault = Vault::open(root).expect("vault opens");
	(directory, vault)
}

#[test]
fn lists_the_copies_apart_from_the_notes() {
	let (_directory, vault) = vault();
	let notes: Vec<String> = vault
		.tree()
		.expect("tree")
		.notes
		.into_iter()
		.map(|note| note.path)
		.collect();
	assert_eq!(notes, ["Maths/A.typ"]);
	let conflicts = vault.conflicts().expect("conflicts");
	assert_eq!(conflicts.len(), 2);
	assert_eq!(conflicts[1].copy, COPY);
	assert_eq!(conflicts[1].note, "Maths/A.typ");
	assert_eq!(conflicts[1].tool, "Syncthing");
	assert_eq!(conflicts[0].note, "B.typ");
}

#[test]
fn keeps_the_note_and_trashes_the_copy() {
	let (_directory, vault) = vault();
	vault.resolve_conflict(COPY, Keep::Note).expect("resolved");
	assert_eq!(vault.read_note("Maths/A.typ").expect("note"), "= A\nMine\n");
	assert!(!vault.root().join(COPY).exists());
	assert_eq!(vault.trash_entries().expect("trash").len(), 1);
}

#[test]
fn keeps_the_copy_and_trashes_the_old_text() {
	let (_directory, vault) = vault();
	vault.resolve_conflict(COPY, Keep::Copy).expect("resolved");
	assert_eq!(
		vault.read_note("Maths/A.typ").expect("note"),
		"= A\nTheirs\n"
	);
	assert!(!vault.root().join(COPY).exists());
	let entry = &vault.trash_entries().expect("trash")[0];
	let id = &entry.id;
	let trashed = vault.root().join(format!(".musubi/trash/{id}/{COPY}"));
	assert_eq!(fs::read_to_string(trashed).expect("old"), "= A\nMine\n");
}

#[test]
fn refuses_a_file_that_is_not_a_copy() {
	let (_directory, vault) = vault();
	assert!(vault.resolve_conflict("Maths/A.typ", Keep::Note).is_err());
}
