// SPDX-License-Identifier: GPL-3.0-or-later
//! The flashcards of the index, for reviews.

use super::VaultIndex;
use crate::error::VaultError;

/// A card of a note, as the index stores it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IndexedCard {
	pub note: String,
	/// Rank of the card among those of its note, from 0.
	pub position: i64,
	/// Hash of the Typst source of the question: the key without direction.
	pub hash: String,
	pub question: String,
	pub answer: String,
	pub reverse: bool,
}

impl VaultIndex {
	/// The cards of `scope`, in note and position order: the whole vault
	/// for `""`, one note for a path ending with `.typ`, else a folder and
	/// its sub-folders.
	///
	/// # Errors
	///
	/// A SQLite error.
	pub fn cards(&self, scope: &str) -> Result<Vec<IndexedCard>, VaultError> {
		let mut statement = self.connection.prepare_cached(
			"SELECT note, position, key, question, answer, reverse FROM cards
			WHERE ?1 = '' OR note = ?1 OR substr(note, 1, length(?2)) = ?2
			ORDER BY note, position",
		)?;
		let folder = format!("{scope}/");
		let rows = statement.query_map((scope, &folder), |row| {
			Ok(IndexedCard {
				note: row.get(0)?,
				position: row.get(1)?,
				hash: row.get(2)?,
				question: row.get(3)?,
				answer: row.get(4)?,
				reverse: row.get(5)?,
			})
		})?;
		Ok(rows.collect::<Result<_, _>>()?)
	}
}
