// SPDX-License-Identifier: GPL-3.0-or-later
//! Compiles the notes of the demo vault (`examples/demo-vault`).

use std::path::PathBuf;

use musubi_typst::{
	Card, DiagnosticSeverity, NoteCompiler, NoteLink, SourcePosition, Task,
};

fn demo_vault() -> PathBuf {
	PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../examples/demo-vault")
}

fn link(target: &str, section: Option<&str>) -> NoteLink {
	NoteLink {
		target: target.into(),
		section: section.map(Into::into),
	}
}

#[test]
fn renders_the_demo_note_to_html() {
	let note = NoteCompiler::new(demo_vault()).render("Demo.typ");
	let html = note.html.expect("the demo note compiles");
	assert!(html.contains("<h2>Demo note</h2>"));
	assert!(html.contains("<math"), "math is exported as MathML");
	assert!(html.contains(r#"class="musubi-link""#));
	assert!(html.contains(r#"class="musubi-card""#));
	assert!(html.contains("<table>"));
}

#[test]
fn returns_the_links_of_the_note() {
	let note = NoteCompiler::new(demo_vault()).render("Demo.typ");
	assert_eq!(
		note.index.links,
		vec![
			link("Maths/Analyse", None),
			link("Maths/Analyse", Some("Intégrales")),
			link("Philo/La_poétique_d'Aristote", None),
			link("Missing_note", None),
		],
	);
}

#[test]
fn returns_the_cards_and_tasks_as_plain_text() {
	let note = NoteCompiler::new(demo_vault()).render("Demo.typ");
	assert_eq!(
		note.index.cards.first(),
		Some(&Card {
			question: "What is the capital of France?".into(),
			answer: "Paris".into(),
			reverse: false,
		}),
	);
	assert_eq!(note.index.cards.get(1).map(|card| card.reverse), Some(true));
	assert_eq!(
		note.index.tasks,
		vec![
			Task {
				text: "Write the reading view".into(),
				done: false,
			},
			Task {
				text: "Compile a note to HTML".into(),
				done: true,
			},
		],
	);
}

#[test]
fn compiles_notes_in_folders() {
	let note = NoteCompiler::new(demo_vault()).render("Maths/Analyse.typ");
	assert!(note.html.is_some());
	assert_eq!(note.index.links, vec![link("Demo", None)]);
}

#[test]
fn refuses_notes_outside_the_vault() {
	let note = NoteCompiler::new(demo_vault()).render("../README.md");
	assert!(note.html.is_none());
	let error = note.diagnostics.first().expect("an error is reported");
	assert_eq!(error.severity, DiagnosticSeverity::Error);
}

#[test]
fn hides_the_experimental_html_warning() {
	let note = NoteCompiler::new(demo_vault()).render("Demo.typ");
	assert!(note.diagnostics.is_empty(), "{:?}", note.diagnostics);
}

#[test]
fn reports_a_missing_note() {
	let note = NoteCompiler::new(demo_vault()).render("Missing_note.typ");
	assert!(note.html.is_none());
	assert!(!note.diagnostics.is_empty());
}

#[test]
fn points_errors_to_the_main_note() {
	let vault = tests_vault();
	let note = NoteCompiler::new(vault).render("Broken.typ");
	assert!(note.html.is_none());
	let error = note.diagnostics.first().expect("an error is reported");
	assert_eq!(error.position, Some(SourcePosition { line: 3, column: 1 }));
}

fn tests_vault() -> PathBuf {
	PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/vault")
}
