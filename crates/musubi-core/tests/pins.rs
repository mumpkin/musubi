// SPDX-License-Identifier: GPL-3.0-or-later
//! Pinned notes: stored in `vault.json`, following renames and the trash.

use std::fs;

use musubi_core::Vault;
use musubi_core::trash::now;
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

fn settings(directory: &TempDir) -> serde_json::Value {
	let text = fs::read_to_string(directory.path().join(".musubi/vault.json"))
		.expect("settings");
	serde_json::from_str(&text).expect("JSON")
}

#[test]
fn pins_in_order_and_keeps_the_other_fields() {
	let (directory, vault) = vault_with(&[
		(
			".musubi/vault.json",
			"{\"format\": 0, \"futureField\": [1]}\n",
		),
		("A.typ", "= A\n"),
		("Maths/B.typ", "= B\n"),
	]);
	vault.pin("Maths/B.typ", true).expect("pinned");
	vault.pin("A.typ", true).expect("pinned");
	assert_eq!(vault.tree().expect("tree").pinned, ["Maths/B.typ", "A.typ"]);
	let fields = settings(&directory);
	assert_eq!(fields["futureField"], serde_json::json!([1]));
	assert_eq!(fields["format"], 0);
	vault.pin("Maths/B.typ", false).expect("unpinned");
	assert_eq!(vault.tree().expect("tree").pinned, ["A.typ"]);
}

#[test]
fn another_copy_of_the_vault_shows_the_same_pins() {
	let (directory, vault) = vault_with(&[("A.typ", "= A\n")]);
	vault.pin("A.typ", true).expect("pinned");
	let again = Vault::open(directory.path()).expect("vault opens");
	assert_eq!(again.tree().expect("tree").pinned, ["A.typ"]);
}

#[test]
fn hides_the_pins_of_missing_notes() {
	let (_directory, vault) = vault_with(&[(
		".musubi/vault.json",
		"{\"format\": 0, \"pinned\": [\"Gone.typ\", 3]}\n",
	)]);
	assert!(vault.tree().expect("tree").pinned.is_empty());
}

#[test]
fn a_renamed_note_stays_pinned() {
	let (_directory, vault) = vault_with(&[("Draft.typ", "= Draft\n")]);
	vault.pin("Draft.typ", true).expect("pinned");
	let path = musubi_core::save_note(&vault, "Draft.typ", "= Final\n")
		.expect("saved");
	assert_eq!(path, "Final.typ");
	assert_eq!(vault.tree().expect("tree").pinned, ["Final.typ"]);
}

#[test]
fn a_trashed_note_is_not_pinned_again_when_restored() {
	let (_directory, vault) = vault_with(&[("A.typ", "= A\n")]);
	vault.pin("A.typ", true).expect("pinned");
	let entry = vault.trash_note("A.typ", now()).expect("trashed");
	vault.restore(&entry.id).expect("restored");
	assert!(vault.tree().expect("tree").pinned.is_empty());
}

#[test]
fn leaves_an_unreadable_settings_file_alone() {
	let (directory, vault) =
		vault_with(&[(".musubi/vault.json", "{ broken"), ("A.typ", "= A\n")]);
	assert!(vault.pin("A.typ", true).is_err());
	let text = fs::read_to_string(directory.path().join(".musubi/vault.json"))
		.expect("settings");
	assert_eq!(text, "{ broken");
}
