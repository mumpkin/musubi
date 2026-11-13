// SPDX-License-Identifier: GPL-3.0-or-later
//! Bringing the index up to date with the vault: notes whose file time or
//! size changed are compiled and indexed again, deleted notes are removed.

use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::Path;
use std::time::UNIX_EPOCH;

use musubi_typst::{NoteCompiler, NoteIndex, NoteLink};
use rusqlite::Transaction;

use super::VaultIndex;
use crate::cards::{question_hash, question_sources};
use crate::context::{LinkContext, link_contexts};
use crate::error::VaultError;
use crate::passages::passages;
use crate::vault::{NoteEntry, Vault};

/// What tells whether a file changed since it was indexed.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Stamp {
	modified: i64,
	size: i64,
}

fn stamp(file: &Path) -> Result<Stamp, VaultError> {
	let metadata = fs::metadata(file)?;
	let modified = metadata
		.modified()?
		.duration_since(UNIX_EPOCH)
		.map_or(0, |time| i64::try_from(time.as_nanos()).unwrap_or(i64::MAX));
	Ok(Stamp {
		modified,
		size: i64::try_from(metadata.len()).unwrap_or(i64::MAX),
	})
}

/// The sentence around each link: the context written for the same target,
/// in order. A link made by a function of the note has no context.
fn with_contexts(
	links: &[NoteLink],
	contexts: Vec<LinkContext>,
) -> Vec<(&NoteLink, String)> {
	let mut contexts: Vec<Option<LinkContext>> =
		contexts.into_iter().map(Some).collect();
	links
		.iter()
		.map(|link| {
			let context = contexts
				.iter_mut()
				.find(|found| {
					found.as_ref().is_some_and(|it| it.target == link.target)
				})
				.and_then(Option::take)
				.map(|found| found.context)
				.unwrap_or_default();
			(link, context)
		})
		.collect()
}

/// Writes the index entries of notes, inside one transaction.
struct Indexer<'run> {
	transaction: Transaction<'run>,
	vault: &'run Vault,
	compiler: &'run mut NoteCompiler,
}

impl Indexer<'_> {
	fn insert_links(
		&self,
		note: &str,
		links: Vec<(&NoteLink, String)>,
	) -> Result<(), VaultError> {
		let mut statement = self.transaction.prepare_cached(
			"INSERT INTO links (note, position, target, section, context)
			VALUES (?1, ?2, ?3, ?4, ?5)",
		)?;
		for (position, (link, context)) in (0_i64..).zip(links) {
			statement.execute((
				note,
				position,
				&link.target,
				&link.section,
				context,
			))?;
		}
		Ok(())
	}

	fn insert_cards_and_tasks(
		&self,
		(note, source): (&str, &str),
		facts: &NoteIndex,
	) -> Result<(), VaultError> {
		let mut card = self.transaction.prepare_cached(
			"INSERT INTO cards (note, position, key, question, answer, reverse)
			VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
		)?;
		// Cards made by code have no source of their own: their key comes
		// from the plain text of the question.
		let questions = question_sources(source);
		for (position, found) in (0_i64..).zip(&facts.cards) {
			let question = usize::try_from(position)
				.ok()
				.and_then(|index| questions.get(index))
				.unwrap_or(&found.question);
			card.execute((
				note,
				position,
				question_hash(question),
				&found.question,
				&found.answer,
				found.reverse,
			))?;
		}
		let mut task = self.transaction.prepare_cached(
			"INSERT INTO tasks (note, position, text, done)
			VALUES (?1, ?2, ?3, ?4)",
		)?;
		for (position, found) in (0_i64..).zip(&facts.tasks) {
			task.execute((note, position, &found.text, found.done))?;
		}
		Ok(())
	}

	/// Indexes one note again. A note that does not compile keeps no links
	/// until it is fixed.
	fn index_note(
		&mut self,
		entry: &NoteEntry,
		stamp: Stamp,
	) -> Result<(), VaultError> {
		let source = self.vault.read_note(&entry.path)?;
		let facts = self.compiler.index(&entry.path).unwrap_or_default();
		self.forget(&entry.path)?;
		self.transaction.execute(
			"INSERT INTO notes (path, title, modified, size)
			VALUES (?1, ?2, ?3, ?4)",
			(&entry.path, &entry.title, stamp.modified, stamp.size),
		)?;
		let links = with_contexts(&facts.links, link_contexts(&source));
		self.insert_links(&entry.path, links)?;
		self.insert_cards_and_tasks((&entry.path, &source), &facts)?;
		self.insert_passages(&entry.path, &source)
	}

	fn insert_passages(
		&self,
		note: &str,
		source: &str,
	) -> Result<(), VaultError> {
		let mut statement = self.transaction.prepare_cached(
			"INSERT INTO passages (path, line, text) VALUES (?1, ?2, ?3)",
		)?;
		for passage in passages(source) {
			let line = i64::try_from(passage.line).unwrap_or(i64::MAX);
			statement.execute((note, line, &passage.text))?;
		}
		Ok(())
	}

	/// Removes a note, its links, cards and tasks.
	fn forget(&self, note: &str) -> Result<(), VaultError> {
		self.transaction
			.execute("DELETE FROM notes WHERE path = ?1", [note])?;
		self.transaction
			.execute("DELETE FROM passages WHERE path = ?1", [note])?;
		Ok(())
	}
}

impl VaultIndex {
	fn stamps(&self) -> Result<HashMap<String, Stamp>, VaultError> {
		let mut statement = self
			.connection
			.prepare("SELECT path, modified, size FROM notes")?;
		let rows = statement.query_map((), |row| {
			Ok((
				row.get(0)?,
				Stamp {
					modified: row.get(1)?,
					size: row.get(2)?,
				},
			))
		})?;
		Ok(rows.collect::<Result<_, _>>()?)
	}

	/// Indexes the notes that changed since the last refresh and forgets
	/// the deleted ones. Returns the number of notes indexed again.
	///
	/// # Errors
	///
	/// An I/O error while reading the vault, or a SQLite error.
	pub fn refresh(
		&mut self,
		vault: &Vault,
		compiler: &mut NoteCompiler,
	) -> Result<usize, VaultError> {
		let stored = self.stamps()?;
		let notes = vault.tree()?.notes;
		let mut indexer = Indexer {
			transaction: self.connection.transaction()?,
			vault,
			compiler,
		};
		let mut indexed = 0;
		for entry in &notes {
			let current = stamp(&vault.root().join(&entry.path))?;
			if stored.get(&entry.path) != Some(&current) {
				indexer.index_note(entry, current)?;
				indexed += 1;
			}
		}
		let present: HashSet<&str> =
			notes.iter().map(|entry| entry.path.as_str()).collect();
		for path in stored
			.keys()
			.filter(|path| !present.contains(path.as_str()))
		{
			indexer.forget(path)?;
		}
		indexer.transaction.commit()?;
		Ok(indexed)
	}
}
