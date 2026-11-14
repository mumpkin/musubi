// SPDX-License-Identifier: GPL-3.0-or-later
//! Typst compilation for Musubi: a note compiled to HTML for the reading
//! view, with its diagnostics and the links, cards and tasks it contains.

mod blocks;
mod diagnostics;
mod entry;
mod fallback;
mod files;
mod index;
mod package;
mod sanitize;
mod source_map;
mod world;

use std::ops::Range;
use std::path::PathBuf;

use serde::Serialize;
use ts_rs::TS;
use typst::WorldExt;
use typst::diag::{SourceDiagnostic, SourceResult, Warned};
use typst::syntax::{Source, VirtualPath};
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

/// How many times a note with a missing package compiles again, with more
/// elements replaced by notices, before giving up.
const MAX_FALLBACK_PASSES: usize = 16;

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
		let compiled = self.compile();
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
		let document = self.compile().output.ok()?;
		Some(NoteIndex::from_introspector(
			document.introspector().as_ref(),
		))
	}

	/// Finds the blocks of the main note and marks the rendered elements
	/// with them.
	fn annotate_blocks(&self, document: &mut HtmlDocument) -> Vec<SourceBlock> {
		let Ok(source) = self.world.original_note() else {
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

	/// Compiles the prepared note. If a package is missing, the elements
	/// of the note that fail are replaced by notices until it compiles.
	fn compile(&mut self) -> Warned<SourceResult<HtmlDocument>> {
		let mut compiled = typst::compile::<HtmlDocument>(&self.world);
		for _ in 0..MAX_FALLBACK_PASSES {
			let Err(errors) = &compiled.output else {
				break;
			};
			if !self.patch_errors(errors) {
				break;
			}
			compiled = typst::compile::<HtmlDocument>(&self.world);
		}
		compiled
	}

	/// Replaces the elements of the note where `errors` are, once a package
	/// is missing; `false` if nothing changed.
	fn patch_errors(&mut self, errors: &[SourceDiagnostic]) -> bool {
		let is_missing = |error: &SourceDiagnostic| {
			fallback::missing_package(&error.message).is_some()
		};
		if self.world.patched_note().is_none() && !errors.iter().any(is_missing)
		{
			return false;
		}
		let Ok(original) = self.world.original_note() else {
			return false;
		};
		let replaced: Vec<_> = errors
			.iter()
			.filter_map(|error| self.element_of(&original, error))
			.collect();
		let mut note = self
			.world
			.take_patched_note()
			.unwrap_or_else(|| fallback::PatchedNote::new(original));
		let mut changed = false;
		for (range, message) in replaced {
			changed |= note.replace(range, &message);
		}
		self.world.patch_note(note);
		changed
	}

	/// The top-level element of the note where `error` is, and the notice
	/// that replaces it.
	fn element_of(
		&self,
		original: &Source,
		error: &SourceDiagnostic,
	) -> Option<(Range<usize>, String)> {
		if error.span.id() != Some(self.world.note()) {
			return None;
		}
		let byte = self.world.to_original(self.world.range(error.span)?.start);
		let range = fallback::element_at(original, byte)?;
		let package = fallback::missing_package(&error.message);
		Some((range, fallback::notice(package)))
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
