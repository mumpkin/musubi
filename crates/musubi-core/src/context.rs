// SPDX-License-Identifier: GPL-3.0-or-later
//! The sentence around each `note-link` of a note, as plain text, for the
//! backlinks panel. Read from the syntax tree: the compiled document does
//! not say where a link was written.

use std::ops::Range;

use typst_syntax::{LinkedNode, SyntaxKind, SyntaxNode};

use crate::links::{arguments, callee_name, collect, first_string};

/// Longest context kept, in characters.
const MAX_CONTEXT_CHARS: usize = 240;
const SENTENCE_ENDS: [char; 3] = ['.', '!', '?'];

/// A `note-link` written in a note, with the sentence around it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LinkContext {
	pub target: String,
	pub context: String,
}

/// Text of a function call: its content arguments (the text of a link),
/// separated by spaces.
fn call_text(call: &SyntaxNode, text: &mut String) {
	let Some(args) = call
		.children()
		.find(|child| child.kind() == SyntaxKind::Args)
	else {
		return;
	};
	let blocks = args
		.children()
		.filter(|child| child.kind() == SyntaxKind::ContentBlock);
	for (index, block) in blocks.enumerate() {
		if index > 0 {
			text.push(' ');
		}
		visible_text(block, text);
	}
}

/// Text of `node` as a reader sees it, roughly: markup removed, code
/// skipped, function calls reduced to their content arguments.
pub(crate) fn visible_text(node: &SyntaxNode, text: &mut String) {
	match node.kind() {
		SyntaxKind::Text
		| SyntaxKind::Shorthand
		| SyntaxKind::SmartQuote
		| SyntaxKind::Link => text.push_str(node.leaf_text()),
		SyntaxKind::Space | SyntaxKind::Linebreak | SyntaxKind::Parbreak => {
			text.push(' ');
		}
		SyntaxKind::Escape => {
			text.push_str(node.leaf_text().trim_start_matches('\\'));
		}
		SyntaxKind::Equation => {
			text.push_str(node.full_text().trim_matches('$').trim());
		}
		SyntaxKind::Raw => text.push_str(node.full_text().trim_matches('`')),
		SyntaxKind::Strong
		| SyntaxKind::Emph
		| SyntaxKind::Markup
		| SyntaxKind::Heading
		| SyntaxKind::ListItem
		| SyntaxKind::EnumItem
		| SyntaxKind::TermItem
		| SyntaxKind::ContentBlock => {
			for child in node.children() {
				visible_text(child, text);
			}
		}
		SyntaxKind::FuncCall => call_text(node, text),
		_ => {}
	}
}

/// The child of the closest markup that contains `call`, and that markup.
fn markup_child<'node>(
	call: &LinkedNode<'node>,
) -> Option<(LinkedNode<'node>, LinkedNode<'node>)> {
	let mut child = call.clone();
	loop {
		let parent = child.parent()?.clone();
		if parent.kind() == SyntaxKind::Markup {
			return Some((child, parent));
		}
		child = parent;
	}
}

/// Whether `node` ends a paragraph: a blank line, or a block of its own
/// such as a heading written on the line before.
fn is_break(node: &SyntaxNode) -> bool {
	matches!(
		node.kind(),
		SyntaxKind::Parbreak
			| SyntaxKind::Heading
			| SyntaxKind::ListItem
			| SyntaxKind::EnumItem
			| SyntaxKind::TermItem
	)
}

/// The paragraph around `call` as text, and where the link is in it.
fn paragraph(call: &LinkedNode<'_>) -> Option<(String, Range<usize>)> {
	let (child, markup) = markup_child(call)?;
	let siblings: Vec<&SyntaxNode> = markup.get().children().collect();
	let index = child.index();
	let start = siblings[..index]
		.iter()
		.rposition(|node| is_break(node))
		.map_or(0, |position| position + 1);
	let end = siblings[index + 1..]
		.iter()
		.position(|node| is_break(node))
		.map_or(siblings.len(), |position| index + 1 + position);
	let mut text = String::new();
	let mut link = 0..0;
	for (position, sibling) in siblings.iter().enumerate().take(end).skip(start)
	{
		if position == index {
			link.start = text.len();
			visible_text(sibling, &mut text);
			link.end = text.len();
		} else {
			visible_text(sibling, &mut text);
		}
	}
	Some((text, link))
}

/// The sentence of `text` that contains `link`, with single spaces.
fn sentence(text: &str, link: Range<usize>) -> String {
	let start = text[..link.start]
		.rfind(SENTENCE_ENDS)
		.map_or(0, |end| end + 1);
	let end = text[link.end..]
		.find(SENTENCE_ENDS)
		.map_or(text.len(), |position| link.end + position + 1);
	let words: Vec<&str> = text[start..end].split_whitespace().collect();
	let sentence = words.join(" ");
	if sentence.chars().count() <= MAX_CONTEXT_CHARS {
		return sentence;
	}
	let mut cut: String = sentence.chars().take(MAX_CONTEXT_CHARS).collect();
	cut.push('…');
	cut
}

/// The `note-link` calls of `source` with a literal target, in source
/// order, each with the sentence it is in.
#[must_use]
pub fn link_contexts(source: &str) -> Vec<LinkContext> {
	let root = typst_syntax::parse(source);
	let mut found = Vec::new();
	collect(&LinkedNode::new(&root), &mut |call| {
		if callee_name(call).as_deref() != Some("note-link") {
			return;
		}
		let Some((_, target)) =
			arguments(call).and_then(|args| first_string(&args))
		else {
			return;
		};
		let context = paragraph(call)
			.map(|(text, link)| sentence(&text, link))
			.unwrap_or_default();
		found.push(LinkContext { target, context });
	});
	found
}

#[cfg(test)]
mod tests {
	use super::{LinkContext, link_contexts};

	fn contexts(source: &str) -> Vec<String> {
		link_contexts(source)
			.into_iter()
			.map(|found| found.context)
			.collect()
	}

	#[test]
	fn keeps_the_sentence_around_the_link() {
		let source = "First sentence. See #note-link(\"Maths/Analyse\")[*the* \
		              analysis] for $x^2$.\nNext one.\n\nOther paragraph.";
		assert_eq!(
			link_contexts(source),
			vec![LinkContext {
				target: "Maths/Analyse".into(),
				context: "See the analysis for x^2.".into(),
			}],
		);
	}

	#[test]
	fn reads_links_in_lists_and_skips_code() {
		let source = "= Title\n#note-link(\"A\")[Under] it\n\
		              - An item with #note-link(\"A\")[a link]\n\
		              - #set text(red) other";
		assert_eq!(contexts(source), vec!["Under it", "An item with a link"]);
	}

	#[test]
	fn finds_every_link_of_a_paragraph() {
		let source = "#note-link(\"A\")[One] and #note-link(\"B\")[two]!";
		assert_eq!(contexts(source), vec!["One and two!", "One and two!"]);
	}

	#[test]
	fn shortens_long_sentences() {
		let words = "word ".repeat(100);
		let source = format!("#note-link(\"A\")[link] {words}");
		let context = contexts(&source).remove(0);
		assert!(context.ends_with('…'));
		assert!(context.starts_with("link word"));
	}
}
