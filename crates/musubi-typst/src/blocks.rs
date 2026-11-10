// SPDX-License-Identifier: GPL-3.0-or-later
//! Top-level blocks of a note, found by parsing its source: the units the
//! block cursor of the reading view moves through.

use std::ops::Range;

use serde::Serialize;
use ts_rs::TS;
use typst::syntax::{Source, SyntaxKind, SyntaxNode};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum BlockKind {
	Heading,
	Paragraph,
	ListItem,
	EnumItem,
	TermItem,
	Equation,
	Code,
	/// A code expression alone, such as `#card[…]` or `#table(…)`.
	Call,
}

/// A top-level block of a note, with its position in the source. Lines
/// start at 0; `end_line` is the line of the last character.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct SourceBlock {
	pub kind: BlockKind,
	#[ts(type = "number")]
	pub start: usize,
	#[ts(type = "number")]
	pub end: usize,
	pub start_line: usize,
	pub end_line: usize,
}

/// Splits a note into blocks. Paragraphs are runs of inline content between
/// blank lines and block elements; spaces and blank lines belong to no block.
pub fn source_blocks(source: &Source) -> Vec<SourceBlock> {
	let mut blocks = Vec::new();
	let mut run: Option<InlineRun> = None;
	let mut offset = 0;
	for node in source.root().children() {
		let range = offset..offset + node.len();
		offset = range.end;
		let text = &source.text()[range.clone()];
		match classify(node, text) {
			Role::Separator => push(&mut blocks, source, run.take()),
			Role::Space => {}
			Role::Block(kind) => {
				push(&mut blocks, source, run.take());
				push(&mut blocks, source, Some(InlineRun::block(kind, range)));
			}
			Role::Hash => run = Some(InlineRun::extend(run, true, range)),
			Role::Inline => run = Some(InlineRun::extend(run, false, range)),
		}
	}
	push(&mut blocks, source, run);
	blocks
}

/// Inline content being gathered into a block. A run made only of code
/// expressions (`#` followed by an expression) is a call; anything else is
/// a paragraph.
struct InlineRun {
	kind: BlockKind,
	range: Range<usize>,
	/// Whether the last node was a `#`: the next node is its expression.
	after_hash: bool,
}

impl InlineRun {
	const fn block(kind: BlockKind, range: Range<usize>) -> Self {
		Self {
			kind,
			range,
			after_hash: false,
		}
	}

	fn extend(run: Option<Self>, is_hash: bool, range: Range<usize>) -> Self {
		let Some(current) = run else {
			let kind = if is_hash {
				BlockKind::Call
			} else {
				BlockKind::Paragraph
			};
			return Self {
				kind,
				range,
				after_hash: is_hash,
			};
		};
		let is_code = is_hash || current.after_hash;
		Self {
			kind: if current.kind == BlockKind::Call && is_code {
				BlockKind::Call
			} else {
				BlockKind::Paragraph
			},
			range: current.range.start..range.end,
			after_hash: is_hash,
		}
	}
}

/// How a top-level syntax node takes part in blocks.
enum Role {
	/// Ends the current paragraph: a blank line.
	Separator,
	/// Whitespace within a paragraph.
	Space,
	Block(BlockKind),
	/// The `#` that starts a code expression.
	Hash,
	Inline,
}

fn classify(node: &SyntaxNode, text: &str) -> Role {
	match node.kind() {
		SyntaxKind::Parbreak => Role::Separator,
		SyntaxKind::Space => Role::Space,
		SyntaxKind::Heading => Role::Block(BlockKind::Heading),
		SyntaxKind::ListItem => Role::Block(BlockKind::ListItem),
		SyntaxKind::EnumItem => Role::Block(BlockKind::EnumItem),
		SyntaxKind::TermItem => Role::Block(BlockKind::TermItem),
		SyntaxKind::Equation if is_display_equation(text) => {
			Role::Block(BlockKind::Equation)
		}
		SyntaxKind::Raw if text.starts_with("```") => {
			Role::Block(BlockKind::Code)
		}
		SyntaxKind::Hash => Role::Hash,
		_ => Role::Inline,
	}
}

/// `$ x $` is displayed as a block, `$x$` inline.
fn is_display_equation(text: &str) -> bool {
	let inner = text.trim_start_matches('$').trim_end_matches('$');
	inner.starts_with(char::is_whitespace)
		&& inner.ends_with(char::is_whitespace)
}

fn push(
	blocks: &mut Vec<SourceBlock>,
	source: &Source,
	run: Option<InlineRun>,
) {
	let Some(InlineRun { kind, range, .. }) = run else {
		return;
	};
	let lines = source.lines();
	let last_byte = range.end.saturating_sub(1).max(range.start);
	blocks.push(SourceBlock {
		kind,
		start: range.start,
		end: range.end,
		start_line: lines.byte_to_line(range.start).unwrap_or_default(),
		end_line: lines.byte_to_line(last_byte).unwrap_or_default(),
	});
}

#[cfg(test)]
mod tests {
	use typst::syntax::Source;

	use super::{BlockKind, source_blocks};

	fn kinds_and_lines(text: &str) -> Vec<(BlockKind, usize, usize)> {
		source_blocks(&Source::detached(text))
			.iter()
			.map(|block| (block.kind, block.start_line, block.end_line))
			.collect()
	}

	#[test]
	fn splits_paragraphs_on_blank_lines() {
		assert_eq!(
			kinds_and_lines("One\nline\n\nTwo"),
			vec![(BlockKind::Paragraph, 0, 1), (BlockKind::Paragraph, 3, 3)],
		);
	}

	#[test]
	fn keeps_each_list_item_with_its_nested_items() {
		assert_eq!(
			kinds_and_lines("- One\n  - Nested\n- Two"),
			vec![(BlockKind::ListItem, 0, 1), (BlockKind::ListItem, 2, 2)],
		);
	}

	#[test]
	fn tells_display_math_from_inline_math() {
		assert_eq!(
			kinds_and_lines("$ x $\n\nText $x$ text"),
			vec![(BlockKind::Equation, 0, 0), (BlockKind::Paragraph, 2, 2)],
		);
	}

	#[test]
	fn makes_a_call_of_code_alone() {
		assert_eq!(
			kinds_and_lines("#card[Q][A]\n\nText with #emph[code]"),
			vec![(BlockKind::Call, 0, 0), (BlockKind::Paragraph, 2, 2)],
		);
	}

	#[test]
	fn ends_a_paragraph_before_a_heading() {
		assert_eq!(
			kinds_and_lines("Text\n= Title\n```\ncode\n```"),
			vec![
				(BlockKind::Paragraph, 0, 0),
				(BlockKind::Heading, 1, 1),
				(BlockKind::Code, 2, 4),
			],
		);
	}

	#[test]
	fn gives_byte_ranges() {
		let blocks = source_blocks(&Source::detached("= é\n\nab"));
		let ranges: Vec<_> = blocks
			.iter()
			.map(|block| (block.start, block.end))
			.collect();
		assert_eq!(ranges, vec![(0, 4), (6, 8)]);
	}
}
