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
	assert!(html.contains(">Demo note</h2>"));
	assert!(html.contains("<math"), "math is exported as MathML");
	assert!(html.contains(r#"class="musubi-link""#));
	assert!(html.contains(r#"class="musubi-card""#));
	assert!(html.contains("<table"));
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

#[test]
fn marks_rendered_elements_with_their_source_block() {
	let note = NoteCompiler::new(tests_vault()).render("Blocks.typ");
	let html = note.html.expect("the note compiles");
	for expected in [
		r#"<h2 data-block="1">"#,
		r#"<p data-block="2">"#,
		r#"<li data-block="3">"#,
		r#"<li data-block="4">"#,
		r#"<math display="block" data-block="7">"#,
		r#"<div class="musubi-card" data-block="8">"#,
		r#"<pre data-block="9">"#,
		r#"<p data-block="12">"#,
	] {
		assert!(html.contains(expected), "missing {expected}");
	}
	assert_eq!(note.blocks.len(), 13);
}

#[test]
fn maps_generated_content_to_its_call() {
	let note = NoteCompiler::new(tests_vault()).render("Edge.typ");
	let html = note.html.expect("the note compiles");
	for expected in [
		r#"<p data-block="1">Lorem"#,
		r#"<strong data-block="4"><span class="musubi-text""#,
		r#"<ul data-block="5">"#,
		"<p>Included paragraph.</p>",
	] {
		assert!(html.contains(expected), "missing {expected}");
	}
}

#[test]
fn renders_nothing_executable() {
	let vault = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/vault");
	let note = NoteCompiler::new(vault).render("Unsafe.typ");
	let html = note.html.expect("the note compiles");
	let body = html.split("<body>").nth(1).expect("a body");
	for forbidden in [
		"<script",
		"<iframe",
		"<object",
		"<style",
		"javascript",
		"onclick",
		"onerror",
		"onmouseover",
		"alert",
	] {
		assert!(!body.contains(forbidden), "{forbidden} in {body}");
	}
	assert!(body.contains("Text that stays."));
	assert!(body.contains(">link</a>"), "the link text stays");
}

#[test]
fn renders_every_element_without_warnings() {
	let vault = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/vault");
	let note = NoteCompiler::new(vault).render("Elements.typ");
	assert!(note.diagnostics.is_empty(), "{:?}", note.diagnostics);
	let html = note.html.expect("the note compiles");
	for element in ["<figure", "<figcaption", "<dl", "<mark", "doc-endnotes"] {
		assert!(html.contains(element), "{element}");
	}
	assert!(
		html.matches("<svg").count() >= 9,
		"shapes, grids and transforms render as SVG"
	);
}

/// The widths of the SVG islands of `html`, in `em`, in order.
fn island_widths(html: &str) -> Vec<&str> {
	html.split("<svg style=\"overflow: visible; width: ")
		.skip(1)
		.filter_map(|rest| rest.split_once("em;").map(|(width, _)| width))
		.collect()
}

#[test]
fn lays_islands_out_at_the_width_of_the_column() {
	let note = NoteCompiler::new(tests_vault()).render("Layout.typ");
	let html = note.html.expect("the note compiles");
	let widths = island_widths(&html);
	// Two grids with `fr` columns, `columns(2)` and `rect(width: 100%)`
	// fill the column (`46em`); a small circle keeps its size.
	assert_eq!(widths, ["46", "46", "46", "46", "2.576950608"]);
	assert!(note.diagnostics.is_empty(), "{:?}", note.diagnostics);
}

#[test]
fn keeps_the_look_of_blocks_and_boxes() {
	let note = NoteCompiler::new(tests_vault()).render("Styles.typ");
	let html = note.html.expect("the note compiles");
	for expected in [
		"border-left: 0.273em solid #b10dc9",
		"padding-top: 0.909em",
		"border-radius: 0.545em 0.545em 0.545em 0.545em",
		"--musubi-fill: #f0f0f0",
		r#"<span class="musubi-box""#,
		"width: 0.909em; height: 0.909em",
		"<div data-block=\"5\">A block without a look</div>",
		"width: 100%\" data-block=\"7\"><h4>",
	] {
		assert!(html.contains(expected), "missing {expected}");
	}
	// The drawing of a fixed height and the gradient are islands.
	assert_eq!(island_widths(&html).len(), 2);
	assert!(note.diagnostics.is_empty(), "{:?}", note.diagnostics);
}

#[test]
fn keeps_text_styles_and_list_numbering() {
	let note = NoteCompiler::new(tests_vault()).render("Text.typ");
	let html = note.html.expect("the note compiles");
	for expected in [
		r#"style="--musubi-color: #ff4136""#,
		r#"style="font-size: 1.273em""#,
		r#"style="letter-spacing: 0.182em""#,
		r#"style="font-weight: 700""#,
		"<strong>strong</strong>",
		"list-style-type: &quot;a) &quot;",
		"list-style-type: &quot;b) &quot;",
		"list-style-type: &quot;a. &quot;",
	] {
		assert!(html.contains(expected), "missing {expected}");
	}
	assert!(note.diagnostics.is_empty(), "{:?}", note.diagnostics);
}

#[test]
fn numbers_equations() {
	let note = NoteCompiler::new(tests_vault()).render("Math.typ");
	let html = note.html.expect("the note compiles");
	for expected in [
		r#"<div id="cases" class="musubi-equation""#,
		r#"<div class="musubi-equation-number">(1)</div>"#,
		r#"<div class="musubi-equation-number">(2)</div>"#,
		r##"<a href="#cases">Equation"##,
	] {
		assert!(html.contains(expected), "missing {expected}");
	}
	assert!(note.diagnostics.is_empty(), "{:?}", note.diagnostics);
}
