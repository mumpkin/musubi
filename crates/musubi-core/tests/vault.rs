// SPDX-License-Identifier: GPL-3.0-or-later
//! Opening a vault, listing and creating notes.

use std::fs;
use std::path::Path;

use musubi_core::{NoteEntry, Vault};
use tempfile::TempDir;

fn vault_with(files: &[(&str, &str)]) -> TempDir {
	let directory = TempDir::new().expect("temporary directory");
	for (path, content) in files {
		let file = directory.path().join(path);
		if let Some(parent) = file.parent() {
			fs::create_dir_all(parent).expect("folder");
		}
		fs::write(file, content).expect("file");
	}
	directory
}

fn open(directory: &Path) -> Vault {
	Vault::open(directory).expect("vault opens")
}

fn note(path: &str, title: &str) -> NoteEntry {
	NoteEntry {
		path: path.into(),
		title: title.into(),
	}
}

#[test]
fn creates_the_settings_file_on_first_open() {
	let directory = vault_with(&[]);
	open(directory.path());
	let settings =
		fs::read_to_string(directory.path().join(".musubi/vault.json"))
			.expect("settings written");
	assert!(settings.contains("\"format\": 0"));
}

#[test]
fn lists_notes_by_title_and_skips_hidden_and_assets() {
	let directory = vault_with(&[
		("Maths/Analyse.typ", "= Analyse réelle\n"),
		("Brouillon_du_jour.typ", "Pas de titre\n"),
		("Maths/Analyse.assets/figure.typ", "= Not a note\n"),
		(".hidden/Secret.typ", "= Hidden\n"),
		("image.png", ""),
	]);
	let tree = open(directory.path()).tree().expect("tree");
	assert_eq!(tree.folders, vec!["Maths".to_owned()]);
	assert_eq!(
		tree.notes,
		vec![
			note("Brouillon_du_jour.typ", "Brouillon du jour"),
			note("Maths/Analyse.typ", "Analyse réelle"),
		],
	);
}

#[test]
fn creates_notes_named_from_their_title() {
	let directory = vault_with(&[("Maths/Mes_cours.typ", "= Mes cours\n")]);
	let vault = open(directory.path());
	let path = vault.create_note("Maths", "Mes cours").expect("created");
	assert_eq!(path, "Maths/Mes_cours_2.typ");
	assert_eq!(vault.read_note(&path).expect("readable"), "= Mes cours\n");
}

#[test]
fn creates_folders() {
	let directory = vault_with(&[]);
	let vault = open(directory.path());
	let folder = vault.create_folder("", "Cours de philo").expect("created");
	assert_eq!(folder, "Cours_de_philo");
	assert!(directory.path().join(folder).is_dir());
}

#[test]
fn reads_only_notes_inside_the_vault() {
	let directory = vault_with(&[("Note.typ", "= Note\n"), ("data.txt", "x")]);
	let vault = open(directory.path());
	assert!(vault.read_note("Note.typ").is_ok());
	assert!(vault.read_note("data.txt").is_err());
	assert!(vault.read_note("../outside.typ").is_err());
	assert!(vault.create_note("../outside", "Escape").is_err());
}

#[test]
fn opens_newer_vaults_read_only() {
	let directory = vault_with(&[(".musubi/vault.json", "{\"format\": 9}")]);
	let vault = open(directory.path());
	assert!(vault.read_only);
	assert!(vault.create_note("", "New").is_err());
}

#[test]
fn saves_notes_in_place() {
	let directory = vault_with(&[("Note.typ", "= Note\n")]);
	let vault = open(directory.path());
	vault
		.write_note("Note.typ", "= Note\n\nMore.\n")
		.expect("saved");
	assert_eq!(
		vault.read_note("Note.typ").expect("read"),
		"= Note\n\nMore.\n"
	);
	assert!(!directory.path().join("Note.typ.musubi-tmp").exists());
	assert!(vault.write_note("../Note.typ", "x").is_err());
	assert!(vault.write_note("Missing.typ", "x").is_err());
}
