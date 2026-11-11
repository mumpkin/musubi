// SPDX-License-Identifier: GPL-3.0-or-later
//! Full-text search over the passages of the notes (SQLite FTS5).

use serde::Serialize;
use ts_rs::TS;

use super::VaultIndex;
use crate::error::VaultError;

/// Most results returned by a search.
const MAX_RESULTS: i64 = 50;
/// Words of context kept around the matches in an excerpt.
const EXCERPT_WORDS: i64 = 12;
/// Marks around the matched words in excerpts (Unicode private use).
pub const MATCH_START: char = '\u{E000}';
pub const MATCH_END: char = '\u{E001}';

/// A passage of a note matching a search.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, TS)]
#[ts(export)]
pub struct TextMatch {
	/// Path of the note from the vault root, with the extension.
	pub path: String,
	pub title: String,
	/// Line (from 0) where the passage starts.
	pub line: u32,
	/// The passage around the matches, which are between `U+E000` and
	/// `U+E001`.
	pub excerpt: String,
}

/// FTS5 query for `text`: every word, as a prefix, in any order.
fn fts_query(text: &str) -> String {
	text.split_whitespace()
		.map(|word| format!("\"{}\"*", word.replace('"', "")))
		.filter(|word| word != "\"\"*")
		.collect::<Vec<_>>()
		.join(" ")
}

impl VaultIndex {
	/// Passages containing every word of `text` (as prefixes, ignoring case
	/// and accents), best first.
	///
	/// # Errors
	///
	/// A SQLite error.
	pub fn search_text(
		&self,
		text: &str,
	) -> Result<Vec<TextMatch>, VaultError> {
		let query = fts_query(text);
		if query.is_empty() {
			return Ok(Vec::new());
		}
		let mut statement = self.connection.prepare_cached(
			"SELECT passages.path, notes.title, passages.line,
				snippet(passages, 2, ?2, ?3, '…', ?4)
			FROM passages JOIN notes ON notes.path = passages.path
			WHERE passages MATCH ?1
			ORDER BY rank LIMIT ?5",
		)?;
		let parameters = (
			query,
			MATCH_START.to_string(),
			MATCH_END.to_string(),
			EXCERPT_WORDS,
			MAX_RESULTS,
		);
		let rows = statement.query_map(parameters, |row| {
			Ok(TextMatch {
				path: row.get(0)?,
				title: row.get(1)?,
				line: row.get(2)?,
				excerpt: row.get(3)?,
			})
		})?;
		Ok(rows.collect::<Result<_, _>>()?)
	}
}

#[cfg(test)]
mod tests {
	use super::fts_query;

	#[test]
	fn searches_every_word_as_a_prefix() {
		assert_eq!(fts_query(" integr  \"de "), "\"integr\"* \"de\"*");
		assert_eq!(fts_query("\""), "");
	}
}
