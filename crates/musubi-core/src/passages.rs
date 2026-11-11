// SPDX-License-Identifier: GPL-3.0-or-later
//! The text of a note as passages for full-text search: one per paragraph,
//! heading or list item, without markup, with the line it starts on.

use typst_syntax::{LinkedNode, SyntaxKind};

use crate::context::visible_text;

/// A passage of a note, as plain text.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Passage {
	/// Line (from 0) where the passage starts in the source.
	pub line: usize,
	pub text: String,
}

/// Whether `kind` is a block of its own, a passage by itself.
const fn is_block(kind: SyntaxKind) -> bool {
	matches!(
		kind,
		SyntaxKind::Heading
			| SyntaxKind::ListItem
			| SyntaxKind::EnumItem
			| SyntaxKind::TermItem
	)
}

struct Collector<'source> {
	source: &'source str,
	passages: Vec<Passage>,
	text: String,
	start: Option<usize>,
}

impl Collector<'_> {
	fn line_of(&self, offset: usize) -> usize {
		self.source[..offset].matches('\n').count()
	}

	fn finish(&mut self) {
		let text = self.text.split_whitespace().collect::<Vec<_>>().join(" ");
		if let Some(start) = self.start.take()
			&& !text.is_empty()
		{
			self.passages.push(Passage {
				line: self.line_of(start),
				text,
			});
		}
		self.text.clear();
	}

	fn add(&mut self, node: &LinkedNode<'_>) {
		if node.kind() == SyntaxKind::Parbreak {
			self.finish();
			return;
		}
		let is_block = is_block(node.kind());
		if is_block {
			self.finish();
		}
		let before = self.text.len();
		visible_text(node.get(), &mut self.text);
		if !self.text[before..].trim().is_empty() {
			self.start.get_or_insert(node.offset());
		}
		if is_block {
			self.finish();
		}
	}
}

/// Passages of `source`, in order. Code without content (imports, rules)
/// gives no text.
#[must_use]
pub fn passages(source: &str) -> Vec<Passage> {
	let root = typst_syntax::parse(source);
	let mut collector = Collector {
		source,
		passages: Vec::new(),
		text: String::new(),
		start: None,
	};
	for child in LinkedNode::new(&root).children() {
		collector.add(&child);
	}
	collector.finish();
	collector.passages
}

#[cfg(test)]
mod tests {
	use super::{Passage, passages};

	fn passage(line: usize, text: &str) -> Passage {
		Passage {
			line,
			text: text.into(),
		}
	}

	#[test]
	fn splits_paragraphs_headings_and_items() {
		let source = "#import \"@local/musubi:0.1.0\": card\n= Title\n\
		              First *line*\nsame paragraph.\n\n- item one\n- item two\n\n\
		              #card[Question?][Answer]";
		assert_eq!(
			passages(source),
			vec![
				passage(1, "Title"),
				passage(2, "First line same paragraph."),
				passage(5, "item one"),
				passage(6, "item two"),
				passage(8, "Question? Answer"),
			],
		);
	}
}
