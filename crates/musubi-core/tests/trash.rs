// SPDX-License-Identifier: GPL-3.0-or-later
//! The trash: delete, restore, purge.

use std::fs;
use std::path::Path;

use musubi_core::Vault;
use tempfile::TempDir;

/// 2026-11-10T14:03:22Z.
const DELETED_AT: i64 = 1_794_319_402;
const DAY: i64 = 86_400;

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

fn exists(root: &Path, path: &str) -> bool {
	root.join(path).exists()
}

fn check_entry_files(root: &Path, id: &str) {
	let trashed = format!(".musubi/trash/{id}");
	assert!(exists(root, &format!("{trashed}/Maths/Old.assets/f.png")));
	let json = fs::read_to_string(root.join(format!("{trashed}/entry.json")))
		.expect("entry.json");
	assert!(json.contains("\"originalPath\": \"Maths/Old.typ\""));
	assert!(json.contains("\"deletedAt\": \"2026-11-10T14:03:22Z\""));
}

#[test]
fn deletes_and_restores_a_note_with_its_images() {
	let (directory, vault) = vault_with(&[
		(
			"Maths/Old.typ",
			"= Old note\n#image(\"Old.assets/f.png\")\n",
		),
		("Maths/Old.assets/f.png", "png"),
	]);
	let root = directory.path();
	let entry = vault
		.trash_note("Maths/Old.typ", DELETED_AT)
		.expect("trashed");
	assert!(entry.id.starts_with("20261110T140322Z-"));
	assert_eq!(entry.title, "Old note");
	assert!(!exists(root, "Maths/Old.typ"));
	assert!(!exists(root, "Maths/Old.assets"));
	check_entry_files(root, &entry.id);
	assert!(
		vault.tree().expect("tree").notes.is_empty(),
		"not a note any more"
	);
	assert_eq!(vault.trash_entries().expect("entries"), vec![entry.clone()]);

	assert_eq!(vault.restore(&entry.id).expect("restored"), "Maths/Old.typ");
	assert!(exists(root, "Maths/Old.assets/f.png"));
	assert!(vault.trash_entries().expect("entries").is_empty());
}

#[test]
fn restores_under_a_free_name_and_moves_the_image_paths() {
	let (directory, vault) = vault_with(&[
		("Old.typ", "= Old\n#image(\"Old.assets/f.png\")\n"),
		("Old.assets/f.png", "png"),
	]);
	let entry = vault.trash_note("Old.typ", DELETED_AT).expect("trashed");
	fs::write(directory.path().join("Old.typ"), "= New one\n").expect("file");
	assert_eq!(vault.restore(&entry.id).expect("restored"), "Old_2.typ");
	assert_eq!(
		vault.read_note("Old_2.typ").expect("note"),
		"= Old\n#image(\"Old_2.assets/f.png\")\n"
	);
	assert!(exists(directory.path(), "Old_2.assets/f.png"));
}

#[test]
fn purges_only_the_entries_older_than_the_retention() {
	let (_directory, vault) =
		vault_with(&[("Old.typ", "= Old\n"), ("Recent.typ", "= Recent\n")]);
	assert_eq!(vault.trash_retention_days, 30);
	vault.trash_note("Old.typ", DELETED_AT).expect("trashed");
	vault
		.trash_note("Recent.typ", DELETED_AT + 20 * DAY)
		.expect("trashed");
	let now = DELETED_AT + 31 * DAY;
	assert_eq!(vault.purge_trash(now, 0).expect("purge"), 0, "0 keeps all");
	assert_eq!(vault.purge_trash(now, 30).expect("purge"), 1);
	let left = vault.trash_entries().expect("entries");
	assert_eq!(left.len(), 1);
	assert_eq!(left[0].original_path, "Recent.typ");
	vault.empty_trash().expect("emptied");
	assert!(vault.trash_entries().expect("entries").is_empty());
}

#[test]
fn refuses_entry_names_that_leave_the_trash() {
	let (_directory, vault) = vault_with(&[]);
	assert!(vault.delete_trash_entry("../..").is_err());
	assert!(vault.restore("..").is_err());
}

#[test]
fn trashes_and_restores_a_whole_folder() {
	let (directory, vault) = vault_with(&[
		("Le caca/A.typ", "= A\n"),
		("Le caca/Sub/B.typ", "= B\n"),
		("Le caca/A.assets/x.png", "png"),
		("Other.typ", "= Other\n"),
	]);
	let root = directory.path();
	vault.pin("Le caca/A.typ", true).expect("pinned");
	vault.pin("Other.typ", true).expect("pinned");
	let entry = vault.trash_folder("Le caca", 0).expect("trashed");
	assert!(entry.is_folder);
	assert_eq!((entry.title.as_str(), entry.note_count), ("Le caca", 2));
	assert!(!exists(root, "Le caca"));
	assert_eq!(vault.pinned(), ["Other.typ"]);
	let listed = vault.trash_entries().expect("entries");
	assert_eq!(listed, std::slice::from_ref(&entry));
	fs::create_dir(root.join("Le caca")).expect("taken");
	let restored = vault.restore(&entry.id).expect("restored");
	assert_eq!(restored, "Le caca_2");
	for path in [
		"Le caca_2/A.typ",
		"Le caca_2/Sub/B.typ",
		"Le caca_2/A.assets/x.png",
	] {
		assert!(exists(root, path), "{path}");
	}
	assert!(vault.trash_entries().expect("entries").is_empty());
}

#[test]
fn refuses_to_trash_the_root_or_the_settings() {
	let (_directory, vault) = vault_with(&[("A.typ", "= A\n")]);
	for folder in ["", "/", ".musubi", "../x", "A.typ"] {
		assert!(vault.trash_folder(folder, 0).is_err(), "{folder}");
	}
}
