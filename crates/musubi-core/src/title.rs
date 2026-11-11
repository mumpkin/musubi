// SPDX-License-Identifier: GPL-3.0-or-later
//! Title of a note: the text of its first level-1 heading, markup removed,
//! or its file name (see `docs/vault-format.md`, "Title").

use typst_syntax::{SyntaxKind, SyntaxNode};

/// Text of `node` without markup: emphasis and code keep their text, math
/// keeps its source without the `$`.
fn plain_text(node: &SyntaxNode, text: &mut String) {
	match node.kind() {
		SyntaxKind::HeadingMarker
		| SyntaxKind::RawDelim
		| SyntaxKind::Star
		| SyntaxKind::Underscore => {}
		SyntaxKind::Escape => {
			text.push_str(node.leaf_text().trim_start_matches('\\'));
		}
		SyntaxKind::Space => text.push(' '),
		SyntaxKind::Equation => {
			let source = node.full_text();
			text.push_str(source.trim_matches('$').trim());
		}
		_ if node.children().len() == 0 => text.push_str(node.leaf_text()),
		_ => {
			for child in node.children() {
				plain_text(child, text);
			}
		}
	}
}

fn is_level_one(heading: &SyntaxNode) -> bool {
	heading.children().any(|child| {
		child.kind() == SyntaxKind::HeadingMarker && child.leaf_text() == "="
	})
}

/// Title from the first level-1 heading at the top level of `source`.
#[must_use]
pub fn heading_title(source: &str) -> Option<String> {
	let root = typst_syntax::parse(source);
	let heading = root.children().find(|node| {
		node.kind() == SyntaxKind::Heading && is_level_one(node)
	})?;
	let mut text = String::new();
	plain_text(heading, &mut text);
	let title = text.split_whitespace().collect::<Vec<_>>().join(" ");
	(!title.is_empty()).then_some(title)
}

/// Text of every heading at the top level of `source`, in order: the
/// sections a link can target.
#[must_use]
pub fn headings(source: &str) -> Vec<String> {
	let root = typst_syntax::parse(source);
	root.children()
		.filter(|node| node.kind() == SyntaxKind::Heading)
		.filter_map(|heading| {
			let mut text = String::new();
			plain_text(heading, &mut text);
			let words = text.split_whitespace().collect::<Vec<_>>().join(" ");
			(!words.is_empty()).then_some(words)
		})
		.collect()
}

/// Title from the file stem, with `_` read as spaces.
#[must_use]
pub fn stem_title(stem: &str) -> String {
	stem.replace('_', " ")
}

#[cfg(test)]
mod tests {
	use super::{heading_title, headings, stem_title};

	#[test]
	fn reads_the_first_level_one_heading() {
		let examples = [
			("= Mes cours de maths", "Mes cours de maths"),
			("= Les *intégrales* de Riemann", "Les intégrales de Riemann"),
			("#set page(width: 10cm)\n= Algèbre", "Algèbre"),
			("== Section\n= Titre", "Titre"),
			("= L'équation $x^2$", "L'équation x^2"),
			("= Code `raw` here", "Code raw here"),
			("= Five \\* stars", "Five * stars"),
		];
		for (source, title) in examples {
			assert_eq!(heading_title(source).as_deref(), Some(title));
		}
	}

	#[test]
	fn has_no_title_without_a_level_one_heading() {
		assert_eq!(heading_title("== Only a section\nText"), None);
		assert_eq!(heading_title("#heading[Made by a function]"), None);
	}

	#[test]
	fn lists_the_top_level_headings() {
		let source = "= Note\n== Lists\ntext\n=== Nested *list*\n#[= Hidden]";
		assert_eq!(headings(source), ["Note", "Lists", "Nested list"]);
	}

	#[test]
	fn falls_back_on_the_file_name() {
		assert_eq!(stem_title("Brouillon_du_jour"), "Brouillon du jour");
	}
}
