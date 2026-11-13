// SPDX-License-Identifier: GPL-3.0-or-later
//! The key of a flashcard (`docs/vault-format.md`, "Flashcard review
//! log"): a hash of the Typst source of its question, so that moving or
//! renaming its note keeps its history.

use std::fmt::Write as _;

use sha2::{Digest, Sha256};
use typst_syntax::{LinkedNode, SyntaxKind};
use unicode_normalization::UnicodeNormalization;

use crate::links::{arguments, callee_name, collect};

/// Hex digits of the hash kept in a key.
const KEY_DIGITS: usize = 16;

/// The direction a card is reviewed in: a reverse card has both.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Direction {
	Forward,
	Reverse,
}

impl Direction {
	#[must_use]
	pub const fn name(self) -> &'static str {
		match self {
			Self::Forward => "forward",
			Self::Reverse => "reverse",
		}
	}
}

/// The hash part of a key, from the Typst source of a question.
#[must_use]
pub fn question_hash(question: &str) -> String {
	let normalized: String = question.trim().nfc().collect();
	let digest = Sha256::digest(normalized.as_bytes());
	let mut hash = String::with_capacity(KEY_DIGITS);
	for byte in digest.iter().take(KEY_DIGITS / 2) {
		let _ = write!(hash, "{byte:02x}");
	}
	hash
}

/// The key of a card in one direction: `9f2c4e1a7b3d5f60:forward`.
#[must_use]
pub fn card_key(hash: &str, direction: Direction) -> String {
	format!("{hash}:{}", direction.name())
}

/// The Typst source of the question of `call`, a `card` call: the text of
/// its first content block, without the brackets.
fn question_of(call: &LinkedNode<'_>) -> Option<String> {
	let block = arguments(call)?
		.children()
		.find(|child| child.kind() == SyntaxKind::ContentBlock)?;
	let markup = block
		.children()
		.find(|child| child.kind() == SyntaxKind::Markup)
		.map(|markup| markup.get().full_text().to_string());
	Some(markup.unwrap_or_default())
}

/// The question sources of the `card` calls of `source`, in the order of
/// the document: the order in which the index lists the cards.
#[must_use]
pub fn question_sources(source: &str) -> Vec<String> {
	let root = typst_syntax::parse(source);
	let mut questions = Vec::new();
	collect(&LinkedNode::new(&root), &mut |call| {
		if callee_name(call).as_deref() == Some("card")
			&& let Some(question) = question_of(call)
		{
			questions.push(question);
		}
	});
	questions
}

#[cfg(test)]
mod tests {
	use super::{Direction, card_key, question_hash, question_sources};

	#[test]
	fn reads_the_questions_in_order() {
		let source = "= Words\n#card[chat][cat]\n\
			#musubi.card(reverse: true)[ $x^2$ ][square]\n";
		assert_eq!(question_sources(source), ["chat", " $x^2$ "]);
	}

	#[test]
	fn hashes_the_trimmed_question() {
		let hash = question_hash(" chat\n");
		assert_eq!(hash, question_hash("chat"));
		assert_eq!(hash.len(), 16);
		assert_eq!(
			card_key(&hash, Direction::Reverse),
			format!("{hash}:reverse")
		);
	}
}
