// SPDX-License-Identifier: GPL-3.0-or-later
//! Typst compilation for Musubi: a note compiled to HTML for the reading
//! view, with its diagnostics and the links, cards and tasks it contains.

mod diagnostics;
mod files;
mod index;
mod package;
mod world;

use std::path::PathBuf;

use serde::Serialize;
use ts_rs::TS;
use typst::diag::SourceDiagnostic;
use typst::syntax::VirtualPath;
use typst_html::{HtmlDocument, HtmlOptions};

pub use crate::diagnostics::{Diagnostic, DiagnosticSeverity, SourcePosition};
pub use crate::index::{Card, NoteIndex, NoteLink, Task};
use crate::world::VaultWorld;

/// A note compiled for the reading view.
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export)]
pub struct RenderedNote {
	/// Full HTML document, or `None` if the note has errors.
	pub html: Option<String>,
	pub diagnostics: Vec<Diagnostic>,
	pub index: NoteIndex,
}

/// Compiles the notes of one vault. Keep it alive between compilations:
/// Typst then only recomputes what changed.
pub struct NoteCompiler {
	world: VaultWorld,
}

impl NoteCompiler {
	#[must_use]
	pub fn new(vault_root: PathBuf) -> Self {
		Self {
			world: VaultWorld::new(vault_root),
		}
	}

	/// Compiles the note at `note_path`, relative to the vault root
	/// (`Maths/Analyse.typ`), to HTML.
	pub fn render(&mut self, note_path: &str) -> RenderedNote {
		let note = match VirtualPath::new(note_path) {
			Ok(note) => note,
			Err(error) => return RenderedNote::failed(error.to_string()),
		};
		self.world.prepare(&note);
		let compiled = typst::compile::<HtmlDocument>(&self.world);
		let mut diagnostics = self.diagnostics(&compiled.warnings);
		let document = match compiled.output {
			Ok(document) => document,
			Err(errors) => {
				diagnostics.extend(self.diagnostics(&errors));
				return RenderedNote {
					html: None,
					diagnostics,
					index: NoteIndex::default(),
				};
			}
		};
		let html = match typst_html::html(&document, &HtmlOptions::default()) {
			Ok(html) => Some(html),
			Err(errors) => {
				diagnostics.extend(self.diagnostics(&errors));
				None
			}
		};
		RenderedNote {
			html,
			diagnostics,
			index: NoteIndex::from_introspector(
				document.introspector().as_ref(),
			),
		}
	}

	fn diagnostics(
		&self,
		typst_diagnostics: &[SourceDiagnostic],
	) -> Vec<Diagnostic> {
		typst_diagnostics
			.iter()
			.filter(|diagnostic| !is_html_export_warning(diagnostic))
			.map(|diagnostic| Diagnostic::from_typst(&self.world, diagnostic))
			.collect()
	}
}

/// Typst warns on every HTML export that the feature is experimental. Musubi
/// pins its Typst version, so the warning says nothing to the user.
fn is_html_export_warning(diagnostic: &SourceDiagnostic) -> bool {
	diagnostic
		.message
		.starts_with("html export is under active development")
}

impl RenderedNote {
	fn failed(message: String) -> Self {
		Self {
			html: None,
			diagnostics: vec![Diagnostic {
				severity: DiagnosticSeverity::Error,
				message,
				hints: Vec::new(),
				position: None,
			}],
			index: NoteIndex::default(),
		}
	}
}
