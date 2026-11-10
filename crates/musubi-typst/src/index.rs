// SPDX-License-Identifier: GPL-3.0-or-later
//! Links, cards and tasks of a note, read from the metadata that the
//! `musubi` Typst package emits (`<musubi-link>`, `<musubi-card>`,
//! `<musubi-task>`).

use serde::Serialize;
use ts_rs::TS;
use typst::foundations::{Content, Dict, Label, Selector, Value};
use typst::introspection::{Introspector, MetadataElem};
use typst::utils::PicoStr;

/// A `note-link` of a note.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, TS)]
#[ts(export)]
pub struct NoteLink {
	/// Path of the target from the vault root, without extension.
	pub target: String,
	/// Heading of the target, if any.
	pub section: Option<String>,
}

/// A flashcard, with its question and answer as plain text.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, TS)]
#[ts(export)]
pub struct Card {
	pub question: String,
	pub answer: String,
	pub reverse: bool,
}

/// A task, with its text as plain text.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, TS)]
#[ts(export)]
pub struct Task {
	pub text: String,
	pub done: bool,
}

/// Everything the index needs from one note.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, TS)]
#[ts(export)]
pub struct NoteIndex {
	pub links: Vec<NoteLink>,
	pub cards: Vec<Card>,
	pub tasks: Vec<Task>,
}

impl NoteIndex {
	pub fn from_introspector(introspector: &dyn Introspector) -> Self {
		Self {
			links: metadata(introspector, "musubi-link", |fields| NoteLink {
				target: string(fields, "target").unwrap_or_default(),
				section: string(fields, "section"),
			}),
			cards: metadata(introspector, "musubi-card", |fields| Card {
				question: plain_text(fields, "question"),
				answer: plain_text(fields, "answer"),
				reverse: boolean(fields, "reverse"),
			}),
			tasks: metadata(introspector, "musubi-task", |fields| Task {
				text: plain_text(fields, "body"),
				done: boolean(fields, "done"),
			}),
		}
	}
}

/// Values of the metadata elements with `label`, converted by `convert`.
/// Metadata that is not a dictionary was not emitted by the package and is
/// skipped.
fn metadata<T>(
	introspector: &dyn Introspector,
	label: &str,
	convert: impl Fn(&Dict) -> T,
) -> Vec<T> {
	let Some(label) = Label::new(PicoStr::intern(label)) else {
		return Vec::new();
	};
	introspector
		.query(&Selector::Label(label))
		.iter()
		.filter_map(|element| match metadata_value(element)? {
			Value::Dict(fields) => Some(convert(&fields)),
			_ => None,
		})
		.collect()
}

fn metadata_value(element: &Content) -> Option<Value> {
	Some(element.to_packed::<MetadataElem>()?.value.clone())
}

fn string(fields: &Dict, key: &str) -> Option<String> {
	match fields.get(key) {
		Ok(Value::Str(text)) => Some(text.to_string()),
		_ => None,
	}
}

fn boolean(fields: &Dict, key: &str) -> bool {
	matches!(fields.get(key), Ok(Value::Bool(true)))
}

fn plain_text(fields: &Dict, key: &str) -> String {
	match fields.get(key) {
		Ok(Value::Content(content)) => content.plain_text().to_string(),
		Ok(Value::Str(text)) => text.to_string(),
		_ => String::new(),
	}
}
