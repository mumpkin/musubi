// SPDX-License-Identifier: GPL-3.0-or-later
//! Tables of the index. The index can always be rebuilt from the vault: a
//! new schema version drops and recreates every table.

/// Bump on any change below, or to the data stored, to rebuild indexes.
pub const VERSION: i64 = 3;

pub const DROP: &str = "
DROP TABLE IF EXISTS passages;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS cards;
DROP TABLE IF EXISTS links;
DROP TABLE IF EXISTS notes;
";

/// `modified` (nanoseconds since the Unix epoch) and `size` tell whether a
/// note changed on disk since it was indexed.
pub const CREATE: &str = "
CREATE TABLE notes (
	path TEXT PRIMARY KEY,
	title TEXT NOT NULL,
	modified INTEGER NOT NULL,
	size INTEGER NOT NULL
);
CREATE TABLE links (
	note TEXT NOT NULL REFERENCES notes (path) ON DELETE CASCADE,
	position INTEGER NOT NULL,
	target TEXT NOT NULL,
	section TEXT,
	context TEXT NOT NULL
);
CREATE INDEX links_by_target ON links (target);
CREATE INDEX links_by_note ON links (note);
CREATE TABLE cards (
	note TEXT NOT NULL REFERENCES notes (path) ON DELETE CASCADE,
	position INTEGER NOT NULL,
	-- Hash of the Typst source of the question: the card key without its
	-- direction (see the flashcard review log in `docs/vault-format.md`).
	key TEXT NOT NULL,
	question TEXT NOT NULL,
	answer TEXT NOT NULL,
	reverse INTEGER NOT NULL
);
CREATE TABLE tasks (
	note TEXT NOT NULL REFERENCES notes (path) ON DELETE CASCADE,
	position INTEGER NOT NULL,
	text TEXT NOT NULL,
	done INTEGER NOT NULL
);
CREATE INDEX cards_by_note ON cards (note);
CREATE INDEX tasks_by_note ON tasks (note);
-- Text of the notes without markup, for full-text search. Accents and
-- case are ignored; `line` is where the passage starts (from 0).
CREATE VIRTUAL TABLE passages USING fts5 (
	path UNINDEXED,
	line UNINDEXED,
	text,
	tokenize = 'unicode61 remove_diacritics 2'
);
";
