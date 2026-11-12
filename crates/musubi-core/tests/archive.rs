// SPDX-License-Identifier: GPL-3.0-or-later
//! The archive: notes and folders move to `Archive/` and back, links and
//! pins follow.

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

const LINKING: &str = "#import \"@local/musubi:0.1.0\": note-link\n= Home\n\
	#note-link(\"Maths/Analyse\")[Analyse] #note-link(\"Maths/Sub/B\")[B]\n";

#[test]
fn archives_and_unarchives_a_note_with_its_links_and_pin() {
	let (directory, vault) = vault_with(&[
		("Home.typ", LINKING),
		("Maths/Analyse.typ", "= Analyse\n"),
		("Maths/Analyse.assets/x.png", "png"),
	]);
	vault.pin("Maths/Analyse.typ", true).expect("pinned");
	let archived = vault.archive("Maths/Analyse.typ").expect("archived");
	assert_eq!(archived, "Archive/Maths/Analyse.typ");
	assert!(
		directory
			.path()
			.join("Archive/Maths/Analyse.assets")
			.is_dir()
	);
	let home = vault.read_note("Home.typ").expect("home");
	assert!(home.contains("\"Archive/Maths/Analyse\""), "{home}");
	assert_eq!(vault.pinned(), ["Archive/Maths/Analyse.typ"]);
	let back = vault.unarchive(&archived).expect("unarchived");
	assert_eq!(back, "Maths/Analyse.typ");
	assert!(
		vault
			.read_note("Home.typ")
			.expect("home")
			.contains("\"Maths/Analyse\"")
	);
	assert_eq!(vault.pinned(), ["Maths/Analyse.typ"]);
}

#[test]
fn archives_a_folder_with_every_note_in_it() {
	let (_directory, vault) = vault_with(&[
		("Home.typ", LINKING),
		("Maths/Analyse.typ", "= Analyse\n"),
		("Maths/Sub/B.typ", "= B\n"),
	]);
	assert_eq!(vault.archive("Maths").expect("archived"), "Archive/Maths");
	let home = vault.read_note("Home.typ").expect("home");
	assert!(home.contains("\"Archive/Maths/Sub/B\""), "{home}");
	assert!(vault.read_note("Archive/Maths/Analyse.typ").is_ok());
	vault.unarchive("Archive/Maths").expect("unarchived");
	assert!(vault.read_note("Maths/Sub/B.typ").is_ok());
	assert!(
		!vault.root().join("Archive").exists(),
		"the empty archive goes"
	);
}

#[test]
fn unarchives_under_a_free_name_and_refuses_other_paths() {
	let (_directory, vault) =
		vault_with(&[("A.typ", "= A\n"), ("Archive/B.typ", "= B\n")]);
	vault.archive("A.typ").expect("archived");
	fs::write(vault.root().join("A.typ"), "= Again\n").expect("taken");
	assert_eq!(vault.unarchive("Archive/A.typ").expect("back"), "A_2.typ");
	assert!(vault.archive("Archive/B.typ").is_err());
	assert!(vault.archive("Archive").is_err());
	assert!(vault.unarchive("B.typ").is_err());
}
