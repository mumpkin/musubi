// SPDX-License-Identifier: GPL-3.0-or-later
//! Snapshots of the rendered HTML of the demo vault, of the tutorial and of
//! the test vault: a change to the rendering must not alter simple notes
//! by accident. Run with `MUSUBI_UPDATE_SNAPSHOTS=1` to accept a change,
//! then review the diff of `tests/snapshots/`.

use std::fs;
use std::path::{Path, PathBuf};

use musubi_typst::NoteCompiler;

const UPDATE_VARIABLE: &str = "MUSUBI_UPDATE_SNAPSHOTS";

fn crate_dir() -> PathBuf {
	PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

/// The `.typ` files under `dir`, as paths relative to `root`, sorted.
fn notes(root: &Path, dir: &Path, found: &mut Vec<String>) {
	let mut entries: Vec<PathBuf> = fs::read_dir(dir)
		.expect("the folder is readable")
		.map(|entry| entry.expect("the entry is readable").path())
		.collect();
	entries.sort();
	for path in entries {
		if path.is_dir() {
			notes(root, &path, found);
		} else if path.extension().is_some_and(|ext| ext == "typ") {
			let relative = path.strip_prefix(root).expect("under the root");
			found.push(relative.to_string_lossy().replace('\\', "/"));
		}
	}
}

/// Compares the HTML of every note of `vault` with its snapshot in
/// `tests/snapshots/<name>/`; returns the notes that differ.
fn check_vault(name: &str, vault: &Path) -> Vec<String> {
	let update = std::env::var_os(UPDATE_VARIABLE).is_some();
	let snapshots = crate_dir().join("tests/snapshots").join(name);
	let mut found = Vec::new();
	notes(vault, vault, &mut found);
	let mut compiler = NoteCompiler::new(vault.to_path_buf());
	let mut differences = Vec::new();
	for note in found {
		let html = compiler.render(&note).html.unwrap_or_default();
		let snapshot = snapshots.join(format!("{note}.html"));
		if update {
			let parent = snapshot.parent().expect("a snapshot has a folder");
			fs::create_dir_all(parent).expect("the folder is created");
			fs::write(&snapshot, &html).expect("the snapshot is written");
		} else if fs::read_to_string(&snapshot).ok().as_deref() != Some(&html) {
			differences.push(note);
		}
	}
	differences
}

fn assert_unchanged(name: &str, vault: &Path) {
	let differences = check_vault(name, vault);
	assert!(
		differences.is_empty(),
		"the HTML of {differences:?} differs from tests/snapshots/{name}/ \
		 (set {UPDATE_VARIABLE}=1 to accept the change)",
	);
}

#[test]
fn the_demo_vault_renders_as_its_snapshots() {
	assert_unchanged(
		"demo-vault",
		&crate_dir().join("../../examples/demo-vault"),
	);
}

#[test]
fn the_tutorial_renders_as_its_snapshots() {
	assert_unchanged("tutorial", &crate_dir().join("../../tutorial"));
}

#[test]
fn the_test_vault_renders_as_its_snapshots() {
	assert_unchanged("vault", &crate_dir().join("tests/vault"));
}
