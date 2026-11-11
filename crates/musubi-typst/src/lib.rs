// SPDX-License-Identifier: GPL-3.0-or-later
//! Typst compilation for Musubi: a note compiled to HTML for the reading
//! view, with its diagnostics and the links, cards and tasks it contains.

mod blocks;
mod diagnostics;
mod entry;
mod files;
mod index;
mod package;
mod sanitize;
mod source_map;
mod world;

use std::path::PathBuf;

use serde::Serialize;
use ts_rs::TS;
use typst::World;
use typst::diag::SourceDiagnostic;
use typst::syntax::VirtualPath;
use typst_html::{HtmlDocument, HtmlNode, HtmlOptions, tag};

pub use crate::blocks::{BlockKind, SourceBlock};
pub use crate::diagnostics::{Diagnostic, DiagnosticSeverity, SourcePosition};
pub use crate::index::{Card, NoteIndex, NoteLink, Task};
use crate::source_map::SourceMap;
use crate::world::VaultWorld;

/// A note compiled for the reading view.
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export)]
pub struct RenderedNote {
	/// Full HTML document, or `None` if the note has errors.
	pub html: Option<String>,
	pub diagnostics: Vec<Diagnostic>,
	pub index: NoteIndex,
	/// Top-level blocks of the note. Rendered elements carry the index of
	/// their block in a `data-block` attribute.
	pub blocks: Vec<SourceBlock>,
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
		let mut document = match compiled.output {
			Ok(document) => document,
			Err(errors) => {
				diagnostics.extend(self.diagnostics(&errors));
				return RenderedNote {
					html: None,
					diagnostics,
					index: NoteIndex::default(),
					blocks: Vec::new(),
				};
			}
		};
		sanitize::sanitize(document.root_mut());
		let blocks = self.annotate_blocks(&mut document);
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
			blocks,
		}
	}

	/// Links, cards and tasks of the note at `note_path`, without producing
	/// its HTML; `None` if the note does not compile.
	pub fn index(&mut self, note_path: &str) -> Option<NoteIndex> {
		let note = VirtualPath::new(note_path).ok()?;
		self.world.prepare(&note);
		let document =
			typst::compile::<HtmlDocument>(&self.world).output.ok()?;
		Some(NoteIndex::from_introspector(
			document.introspector().as_ref(),
		))
	}

	/// Finds the blocks of the main note and marks the rendered elements
	/// with them.
	fn annotate_blocks(&self, document: &mut HtmlDocument) -> Vec<SourceBlock> {
		let Ok(source) = self.world.source(self.world.note()) else {
			return Vec::new();
		};
		let blocks = blocks::source_blocks(&source);
		let source_map = SourceMap {
			world: &self.world,
			note: self.world.note(),
			blocks: &blocks,
		};
		for node in document.root_mut().children.make_mut() {
			if let HtmlNode::Element(element) = node
				&& element.tag == tag::body
			{
				source_map.annotate(element);
			}
		}
		blocks
	}

	fn diagnostics(
		&self,
		typst_diagnostics: &[SourceDiagnostic],
	) -> Vec<Diagnostic> {
		typst_diagnostics
			.iter()
			.filter(|diagnostic| !is_html_export_warning(diagnostic))
			.map(|diagnostic| {
				Diagnostic::from_typst(
					&self.world,
					self.world.note(),
					diagnostic,
				)
			})
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
			blocks: Vec::new(),
		}
	}
}
