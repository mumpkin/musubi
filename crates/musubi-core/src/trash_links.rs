// SPDX-License-Identifier: GPL-3.0-or-later
//! Links to a note in the trash (`docs/vault-format.md`, "Trash"): when a
//! note goes to the trash, the links to it in other notes become the text
//! they showed; restoring the note brings them back where that text is
//! still unchanged. The trash entry remembers each link it replaced.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use typst_syntax::{LinkedNode, SyntaxKind};

use crate::error::VaultError;
use crate::links::{arguments, callee_name, collect, first_string};
use crate::rename::target_of;
use crate::title;
use crate::vault::Vault;

/// A link replaced by its text, as kept in `entry.json`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct UnlinkedLink {
	/// The note that held the link.
	pub(crate) note: String,
	/// Byte offset of the text in the note, once replaced.
	pub(crate) at: usize,
	/// The text that replaced the link.
	pub(crate) text: String,
	/// The link as it was written, `#` included.
	pub(crate) link: String,
	/// A few characters before and after the text, to find it unchanged.
	#[serde(default)]
	pub(crate) before: String,
	#[serde(default)]
	pub(crate) after: String,
}

/// Characters of context kept on each side of a replaced link.
const CONTEXT_CHARS: usize = 12;

fn last_chars(text: &str, count: usize) -> &str {
	let start = text
		.char_indices()
		.rev()
		.nth(count - 1)
		.map_or(0, |(index, _)| index);
	&text[start..]
}

fn first_chars(text: &str, count: usize) -> &str {
	let end = text
		.char_indices()
		.nth(count)
		.map_or(text.len(), |(index, _)| index);
	&text[..end]
}

/// One link to replace in a note: its byte range, `#` included, and its
/// text.
struct Replacement {
	start: usize,
	end: usize,
	text: String,
}

/// The text a `note-link` call shows: its content block, or else the name
/// of its target.
fn shown_text(args: &LinkedNode<'_>, target: &str) -> String {
	args.children()
		.filter(|child| child.kind() == SyntaxKind::ContentBlock)
		.find_map(|block| {
			block
				.children()
				.find(|child| child.kind() == SyntaxKind::Markup)
				.map(|markup| markup.get().full_text().to_string())
		})
		.unwrap_or_else(|| {
			title::stem_title(target.rsplit('/').next().unwrap_or(target))
		})
}

/// The links of `source` whose target `is_target` accepts. Only links
/// written in markup (`#note-link(…)`) are replaced: in code, a plain text
/// would not be valid.
fn replacements(
	source: &str,
	is_target: &dyn Fn(&str) -> bool,
) -> Vec<Replacement> {
	let root = typst_syntax::parse(source);
	let mut found = Vec::new();
	collect(&LinkedNode::new(&root), &mut |call| {
		if callee_name(call).as_deref() != Some("note-link") {
			return;
		}
		let Some(args) = arguments(call) else {
			return;
		};
		let Some((_, target)) = first_string(&args) else {
			return;
		};
		let range = call.range();
		let is_markup = range.start > 0
			&& source.as_bytes().get(range.start - 1) == Some(&b'#');
		if is_target(&target) && is_markup {
			found.push(Replacement {
				start: range.start - 1,
				end: range.end,
				text: shown_text(&args, &target),
			});
		}
	});
	found.sort_by_key(|replacement| replacement.start);
	found
}

/// `source` with the links replaced, and the record of each one.
fn unlink_source(
	note: &str,
	source: &str,
	is_target: &dyn Fn(&str) -> bool,
) -> Option<(String, Vec<UnlinkedLink>)> {
	let found = replacements(source, is_target);
	if found.is_empty() {
		return None;
	}
	let mut text = String::with_capacity(source.len());
	let mut records = Vec::new();
	let mut copied = 0;
	for replacement in found {
		text.push_str(&source[copied..replacement.start]);
		records.push(UnlinkedLink {
			note: note.to_owned(),
			at: text.len(),
			text: replacement.text.clone(),
			link: source[replacement.start..replacement.end].to_owned(),
			before: last_chars(&text, CONTEXT_CHARS).to_owned(),
			after: first_chars(&source[replacement.end..], CONTEXT_CHARS)
				.to_owned(),
		});
		text.push_str(&replacement.text);
		copied = replacement.end;
	}
	text.push_str(&source[copied..]);
	Some((text, records))
}

/// Where the text of `record` still is in `text`, with its context: at
/// its offset, or else at the only place it appears.
fn find_text(text: &str, record: &UnlinkedLink) -> Option<usize> {
	let window = format!("{}{}{}", record.before, record.text, record.after);
	let start = record.at.checked_sub(record.before.len())?;
	if text.get(start..start + window.len()) == Some(window.as_str()) {
		return Some(record.at);
	}
	(text.matches(window.as_str()).count() == 1)
		.then(|| text.find(window.as_str()))
		.flatten()
		.map(|found| found + record.before.len())
}

/// `source` with the links of `records` back, last first so that earlier
/// offsets hold. A text edited since, or whose surroundings changed, stays
/// as it is.
fn relink_source(source: &str, records: &[&UnlinkedLink]) -> Option<String> {
	let mut text = source.to_owned();
	let mut changed = false;
	let mut sorted: Vec<&&UnlinkedLink> = records.iter().collect();
	sorted.sort_by_key(|record| std::cmp::Reverse(record.at));
	for record in sorted {
		if let Some(start) = find_text(&text, record) {
			text.replace_range(start..start + record.text.len(), &record.link);
			changed = true;
		}
	}
	changed.then_some(text)
}

impl Vault {
	/// Replaces the links whose target `is_target` accepts (a path without
	/// extension) by their text, in every note `is_trashed` does not
	/// accept. Returns the links replaced.
	pub(crate) fn unlink(
		&self,
		is_target: &dyn Fn(&str) -> bool,
		is_trashed: &dyn Fn(&str) -> bool,
	) -> Result<Vec<UnlinkedLink>, VaultError> {
		let mut all = Vec::new();
		for entry in self.tree()?.notes {
			if is_trashed(&entry.path) {
				continue;
			}
			let source = self.read_note(&entry.path)?;
			if let Some((text, records)) =
				unlink_source(&entry.path, &source, is_target)
			{
				self.write_note(&entry.path, &text)?;
				all.extend(records);
			}
		}
		Ok(all)
	}

	/// Puts back the links of `records`, each written by `rewrite` (for a
	/// note restored under another name). Notes gone since are skipped.
	pub(crate) fn relink(
		&self,
		records: &[UnlinkedLink],
		rewrite: &dyn Fn(&str) -> String,
	) -> Result<(), VaultError> {
		let rewritten: Vec<UnlinkedLink> = records
			.iter()
			.map(|record| UnlinkedLink {
				link: rewrite(&record.link),
				..record.clone()
			})
			.collect();
		let mut by_note: BTreeMap<&str, Vec<&UnlinkedLink>> = BTreeMap::new();
		for record in &rewritten {
			by_note.entry(&record.note).or_default().push(record);
		}
		for (note, links) in by_note {
			let Ok(source) = self.read_note(note) else {
				continue;
			};
			if let Some(text) = relink_source(&source, &links) {
				self.write_note(note, &text)?;
			}
		}
		Ok(())
	}
}

/// The rewrite of links to `original` (a note or a folder, from the vault
/// root) restored as `restored`.
pub(crate) fn retarget(
	original: &str,
	restored: &str,
) -> impl Fn(&str) -> String {
	let (old, new) = (
		format!("\"{}", target_of(original)),
		format!("\"{}", target_of(restored)),
	);
	move |link: &str| {
		if old == new {
			link.to_owned()
		} else {
			link.replacen(&old, &new, 1)
		}
	}
}

#[cfg(test)]
mod tests {
	use super::{relink_source, unlink_source};

	const SOURCE: &str = "= Home\nSee #note-link(\"Maths/A\")[*the* note] \
		and #note-link(\"B\")[b], then #note-link(\"Maths/A\").\n";

	#[test]
	fn replaces_links_by_their_text_and_back() {
		let (text, records) =
			unlink_source("Home.typ", SOURCE, &|target| target == "Maths/A")
				.expect("links");
		assert_eq!(
			text,
			"= Home\nSee *the* note and #note-link(\"B\")[b], then A.\n"
		);
		assert_eq!(records.len(), 2);
		let refs: Vec<_> = records.iter().collect();
		assert_eq!(relink_source(&text, &refs).as_deref(), Some(SOURCE));
	}

	#[test]
	fn leaves_an_edited_text() {
		let (text, records) =
			unlink_source("Home.typ", SOURCE, &|target| target == "B")
				.expect("links");
		let edited = text.replace("and b,", "and bee,");
		let refs: Vec<_> = records.iter().collect();
		assert_eq!(relink_source(&edited, &refs), None);
	}
}
