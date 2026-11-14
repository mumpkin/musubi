// SPDX-License-Identifier: GPL-3.0-or-later
//! Compiler errors and warnings, in a form the interface can show.

use serde::Serialize;
use ts_rs::TS;
use typst::WorldExt;
use typst::diag::{Severity, SourceDiagnostic};
use typst::syntax::FileId;

use crate::world::VaultWorld;

/// An error or a warning of the Typst compiler.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Diagnostic {
	pub severity: DiagnosticSeverity,
	pub message: String,
	pub hints: Vec<String>,
	/// Position in the main note, if the diagnostic points into it.
	pub position: Option<SourcePosition>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum DiagnosticSeverity {
	Error,
	Warning,
}

/// Line and column, both starting at 0, of a byte in a note.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, TS)]
#[ts(export)]
pub struct SourcePosition {
	pub line: usize,
	pub column: usize,
}

impl Diagnostic {
	/// `diagnostic` of a compilation, with its position in `note` if it is
	/// in that file.
	pub(crate) fn from_typst(
		world: &VaultWorld,
		note: FileId,
		diagnostic: &SourceDiagnostic,
	) -> Self {
		Self {
			severity: match diagnostic.severity {
				Severity::Error => DiagnosticSeverity::Error,
				Severity::Warning => DiagnosticSeverity::Warning,
			},
			message: diagnostic.message.to_string(),
			hints: diagnostic
				.hints
				.iter()
				.map(|hint| hint.v.to_string())
				.collect(),
			position: position_in_note(world, note, diagnostic),
		}
	}
}

fn position_in_note(
	world: &VaultWorld,
	note: FileId,
	diagnostic: &SourceDiagnostic,
) -> Option<SourcePosition> {
	if diagnostic.span.id() != Some(note) {
		return None;
	}
	let range = world.range(diagnostic.span)?;
	let source = world.original_note().ok()?;
	let byte = world.to_original(range.start);
	let (line, column) = source.lines().byte_to_line_column(byte)?;
	Some(SourcePosition { line, column })
}
