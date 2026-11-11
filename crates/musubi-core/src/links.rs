// SPDX-License-Identifier: GPL-3.0-or-later
//! Rewrites the paths a note points to, when a note is renamed: the targets
//! of `note-link` and the paths of `image`. Works on the syntax tree, so
//! that only real calls change, never plain text.

use std::ops::Range;

use typst_syntax::{LinkedNode, SyntaxKind};

/// A renamed note: its old and new link targets (path from the vault root,
/// without extension) and titles.
pub struct Renaming<'names> {
	pub old_target: &'names str,
	pub new_target: &'names str,
	pub old_title: &'names str,
	pub new_title: &'names str,
}

struct Edit {
	range: Range<usize>,
	text: String,
}

/// Name of the function called by `call`: `note-link` for
/// `#note-link(…)` and `#musubi.note-link(…)`.
fn callee_name(call: &LinkedNode<'_>) -> Option<String> {
	let callee = call.children().next()?;
	match callee.kind() {
		SyntaxKind::Ident => Some(callee.leaf_text().to_string()),
		SyntaxKind::FieldAccess => callee
			.children()
			.next_back()
			.map(|field| field.leaf_text().to_string()),
		_ => None,
	}
}

fn arguments<'node>(call: &LinkedNode<'node>) -> Option<LinkedNode<'node>> {
	call.children()
		.find(|child| child.kind() == SyntaxKind::Args)
}

/// The first positional string argument, with its value.
fn first_string<'node>(
	args: &LinkedNode<'node>,
) -> Option<(LinkedNode<'node>, String)> {
	let string = args
		.children()
		.find(|child| child.kind() == SyntaxKind::Str)?;
	let value = string.leaf_text().trim_matches('"').to_owned();
	Some((string, value))
}

fn quoted(value: &str) -> String {
	format!("\"{}\"", value.replace('\\', "\\\\").replace('"', "\\\""))
}

/// Edits for one `note-link` call: the target, and the link text when it
/// was the old title.
fn link_edits(
	call: &LinkedNode<'_>,
	renaming: &Renaming<'_>,
	edits: &mut Vec<Edit>,
) {
	let Some(args) = arguments(call) else {
		return;
	};
	let Some((string, target)) = first_string(&args) else {
		return;
	};
	if target != renaming.old_target {
		return;
	}
	edits.push(Edit {
		range: string.range(),
		text: quoted(renaming.new_target),
	});
	let body = args
		.children()
		.filter(|child| child.kind() == SyntaxKind::ContentBlock)
		.find_map(|block| {
			block
				.children()
				.find(|child| child.kind() == SyntaxKind::Markup)
		});
	if let Some(markup) = body
		&& markup.get().full_text().trim() == renaming.old_title
	{
		edits.push(Edit {
			range: markup.range(),
			text: renaming.new_title.to_owned(),
		});
	}
}

fn collect<'node>(
	node: &LinkedNode<'node>,
	visit: &mut dyn FnMut(&LinkedNode<'node>),
) {
	if node.kind() == SyntaxKind::FuncCall {
		visit(node);
	}
	for child in node.children() {
		collect(&child, visit);
	}
}

fn apply(source: &str, mut edits: Vec<Edit>) -> Option<String> {
	if edits.is_empty() {
		return None;
	}
	edits.sort_by_key(|edit| std::cmp::Reverse(edit.range.start));
	let mut text = source.to_owned();
	for edit in edits {
		text.replace_range(edit.range, &edit.text);
	}
	Some(text)
}

/// `source` with its links to the renamed note updated, or `None` if it has
/// none.
#[must_use]
pub fn rewrite_links(source: &str, renaming: &Renaming<'_>) -> Option<String> {
	let root = typst_syntax::parse(source);
	let mut edits = Vec::new();
	collect(&LinkedNode::new(&root), &mut |call| {
		if callee_name(call).as_deref() == Some("note-link") {
			link_edits(call, renaming, &mut edits);
		}
	});
	apply(source, edits)
}

/// `source` with every `image` path for which `rewrite` gives a new value
/// updated, or `None` if none changes.
pub fn rewrite_images(
	source: &str,
	rewrite: &dyn Fn(&str) -> Option<String>,
) -> Option<String> {
	let root = typst_syntax::parse(source);
	let mut edits = Vec::new();
	collect(&LinkedNode::new(&root), &mut |call| {
		if callee_name(call).as_deref() != Some("image") {
			return;
		}
		let found = arguments(call).and_then(|args| first_string(&args));
		if let Some((string, path)) = found
			&& let Some(new_path) = rewrite(&path)
		{
			edits.push(Edit {
				range: string.range(),
				text: quoted(&new_path),
			});
		}
	});
	apply(source, edits)
}

#[cfg(test)]
mod tests {
	use super::{Renaming, rewrite_images, rewrite_links};

	const RENAMING: Renaming<'static> = Renaming {
		old_target: "Maths/Analyse",
		new_target: "Maths/Analyse_réelle",
		old_title: "Analyse",
		new_title: "Analyse réelle",
	};

	#[test]
	fn updates_the_target_and_the_text_equal_to_the_old_title() {
		let source = "See #note-link(\"Maths/Analyse\")[Analyse].";
		assert_eq!(
			rewrite_links(source, &RENAMING).as_deref(),
			Some("See #note-link(\"Maths/Analyse_réelle\")[Analyse réelle]."),
		);
	}

	#[test]
	fn keeps_a_custom_link_text_and_the_section() {
		let source =
			"#note-link(\"Maths/Analyse\", section: \"Intégrales\")[integrals]";
		assert_eq!(
			rewrite_links(source, &RENAMING).as_deref(),
			Some(
				"#note-link(\"Maths/Analyse_réelle\", section: \"Intégrales\")[integrals]"
			),
		);
	}

	#[test]
	fn leaves_other_links_and_plain_text_alone() {
		let source = "Maths/Analyse in text, #note-link(\"Philo/Kant\")[Kant]";
		assert_eq!(rewrite_links(source, &RENAMING), None);
	}

	#[test]
	fn rewrites_image_paths() {
		let source = "#image(\"Analyse.assets/f.png\") #image(\"other.png\")";
		let rewritten = rewrite_images(source, &|path| {
			path.strip_prefix("Analyse.assets/")
				.map(|rest| format!("Analyse_réelle.assets/{rest}"))
		});
		assert_eq!(
			rewritten.as_deref(),
			Some(
				"#image(\"Analyse_réelle.assets/f.png\") #image(\"other.png\")"
			),
		);
	}
}
