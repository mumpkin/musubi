// SPDX-License-Identifier: GPL-3.0-or-later
//! Fuzzy search over note titles, with the matcher of Helix (`nucleo`).

use std::collections::HashMap;

use nucleo_matcher::pattern::{CaseMatching, Normalization, Pattern};
use nucleo_matcher::{Config, Matcher, Utf32Str};
use serde::Serialize;
use ts_rs::TS;

use crate::vault::NoteEntry;

/// Most results returned by a search.
const MAX_RESULTS: usize = 50;

/// A note found by its title.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, TS)]
#[ts(export)]
pub struct NoteMatch {
	/// Path from the vault root, with the extension.
	pub path: String,
	pub title: String,
	/// Folder of the note, when another note has the same title.
	pub folder: Option<String>,
}

fn folder_of(path: &str) -> String {
	path.rfind('/')
		.map_or_else(String::new, |slash| path[..slash].to_owned())
}

/// `items` whose text matches `query`, best first, in their order for equal
/// scores; all of them for an empty query. Case is ignored unless the query
/// has capitals, and accents unless it has some (smart case and
/// normalization).
fn ranked<'items, T>(
	items: &'items [T],
	text: impl Fn(&T) -> &str,
	query: &str,
) -> Vec<&'items T> {
	let pattern =
		Pattern::parse(query, CaseMatching::Smart, Normalization::Smart);
	let mut matcher = Matcher::new(Config::DEFAULT);
	let mut buffer = Vec::new();
	let mut scored: Vec<(u32, &T)> = items
		.iter()
		.filter_map(|item| {
			let haystack = Utf32Str::new(text(item), &mut buffer);
			pattern
				.score(haystack, &mut matcher)
				.map(|score| (score, item))
		})
		.collect();
	scored.sort_by_key(|(score, _)| std::cmp::Reverse(*score));
	scored
		.into_iter()
		.take(MAX_RESULTS)
		.map(|(_, item)| item)
		.collect()
}

/// Notes whose title matches `query`, best first, then by title.
#[must_use]
pub fn search_titles(notes: &[NoteEntry], query: &str) -> Vec<NoteMatch> {
	let mut counts: HashMap<&str, usize> = HashMap::new();
	for note in notes {
		*counts.entry(note.title.as_str()).or_default() += 1;
	}
	let mut sorted = notes.to_vec();
	sorted.sort_by(|left, right| {
		left.title
			.cmp(&right.title)
			.then_with(|| left.path.cmp(&right.path))
	});
	ranked(&sorted, |note| &note.title, query)
		.into_iter()
		.map(|note| NoteMatch {
			path: note.path.clone(),
			title: note.title.clone(),
			folder: (counts.get(note.title.as_str()) > Some(&1))
				.then(|| folder_of(&note.path)),
		})
		.collect()
}

/// Headings of a note matching `query`, best first, then in note order.
#[must_use]
pub fn search_headings(headings: &[String], query: &str) -> Vec<String> {
	ranked(headings, String::as_str, query)
		.into_iter()
		.cloned()
		.collect()
}

#[cfg(test)]
mod tests {
	use super::{search_headings, search_titles};
	use crate::vault::NoteEntry;

	fn notes() -> Vec<NoteEntry> {
		[
			("Maths/Analyse.typ", "Analyse"),
			("Philo/Analyse.typ", "Analyse"),
			("Demo.typ", "Demo note"),
			("Maths/Algèbre.typ", "Algèbre linéaire"),
		]
		.into_iter()
		.map(|(path, title)| NoteEntry {
			path: path.into(),
			title: title.into(),
		})
		.collect()
	}

	fn found(query: &str) -> Vec<String> {
		search_titles(&notes(), query)
			.into_iter()
			.map(|found| found.path)
			.collect()
	}

	#[test]
	fn matches_titles_fuzzily_and_without_accents() {
		assert_eq!(
			found("ana")[..2],
			["Maths/Analyse.typ", "Philo/Analyse.typ"]
		);
		assert_eq!(found("dnote"), ["Demo.typ"]);
		assert_eq!(found("algebre"), ["Maths/Algèbre.typ"]);
		assert!(found("zzz").is_empty());
	}

	#[test]
	fn lists_every_note_for_an_empty_query() {
		assert_eq!(found("").len(), notes().len());
	}

	#[test]
	fn shows_the_folder_only_for_shared_titles() {
		let results = search_titles(&notes(), "");
		let folders: Vec<Option<&str>> = results
			.iter()
			.map(|found| found.folder.as_deref())
			.collect();
		assert_eq!(folders, [None, Some("Maths"), Some("Philo"), None]);
	}

	#[test]
	fn matches_headings_in_note_order() {
		let headings = ["Links".to_owned(), "Lists".to_owned(), "Math".into()];
		assert_eq!(search_headings(&headings, "li"), ["Links", "Lists"]);
		assert_eq!(search_headings(&headings, "").len(), 3);
	}
}
