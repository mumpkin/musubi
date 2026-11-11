// SPDX-License-Identifier: GPL-3.0-or-later
//! Index of the links, cards and tasks of a vault, in SQLite. It lives in
//! the app data directory, never in the vault, and is rebuilt from the
//! vault when it is missing, outdated or unreadable
//! (`docs/vault-format.md`, "What is never in the vault").

mod graph;
mod refresh;
mod schema;
mod text_search;

use std::fmt::Write as _;
use std::fs;
use std::path::{Path, PathBuf};

use rusqlite::Connection;
use serde::Serialize;
use sha2::{Digest, Sha256};
use ts_rs::TS;

pub use self::graph::{Graph, GraphLink, GraphNode};
pub use self::text_search::TextMatch;
use crate::error::VaultError;

/// Hex digits of the vault path hash in the index file name.
const NAME_BYTES: usize = 8;

/// A note that links to another one.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, TS)]
#[ts(export)]
pub struct Backlink {
	/// Path of the linking note, from the vault root, with the extension.
	pub path: String,
	pub title: String,
	/// Heading of the target the link points to, if any.
	pub section: Option<String>,
	/// The sentence around the link, as plain text.
	pub context: String,
}

pub struct VaultIndex {
	connection: Connection,
}

impl VaultIndex {
	/// File of the index of the vault at `vault_root`, in `data_dir`: one
	/// file per vault, named from a hash of its path.
	#[must_use]
	pub fn file_for(data_dir: &Path, vault_root: &Path) -> PathBuf {
		let hash = Sha256::digest(vault_root.as_os_str().as_encoded_bytes());
		let name = hash.iter().take(NAME_BYTES).fold(
			String::new(),
			|mut name, byte| {
				let _ = write!(name, "{byte:02x}");
				name
			},
		);
		data_dir.join("indexes").join(format!("{name}.sqlite"))
	}

	/// Opens the index stored in `file`. An unreadable file is deleted and
	/// the index starts empty.
	///
	/// # Errors
	///
	/// An I/O or SQLite error if no index can be created at all.
	pub fn open(file: &Path) -> Result<Self, VaultError> {
		if let Some(folder) = file.parent() {
			fs::create_dir_all(folder)?;
		}
		Connection::open(file)
			.map_err(VaultError::from)
			.and_then(Self::prepare)
			.or_else(|_| {
				fs::remove_file(file)?;
				Self::prepare(Connection::open(file)?)
			})
	}

	/// An index kept in memory, for tests.
	///
	/// # Errors
	///
	/// A SQLite error.
	pub fn in_memory() -> Result<Self, VaultError> {
		Self::prepare(Connection::open_in_memory()?)
	}

	fn prepare(connection: Connection) -> Result<Self, VaultError> {
		connection.pragma_update(None, "foreign_keys", true)?;
		let version: i64 =
			connection
				.pragma_query_value(None, "user_version", |row| row.get(0))?;
		if version != schema::VERSION {
			connection.execute_batch(schema::DROP)?;
			connection.execute_batch(schema::CREATE)?;
			connection.pragma_update(None, "user_version", schema::VERSION)?;
		}
		Ok(Self { connection })
	}

	/// Notes that link to the note at `note` (with its extension), other
	/// than itself, by title then position of the link.
	///
	/// # Errors
	///
	/// A SQLite error.
	pub fn backlinks(&self, note: &str) -> Result<Vec<Backlink>, VaultError> {
		let target = note.strip_suffix(".typ").unwrap_or(note);
		let mut statement = self.connection.prepare_cached(
			"SELECT links.note, notes.title, links.section, links.context
			FROM links JOIN notes ON notes.path = links.note
			WHERE links.target = ?1 AND links.note != ?2
			ORDER BY notes.title, links.note, links.position",
		)?;
		let rows = statement.query_map((target, note), |row| {
			Ok(Backlink {
				path: row.get(0)?,
				title: row.get(1)?,
				section: row.get(2)?,
				context: row.get(3)?,
			})
		})?;
		Ok(rows.collect::<Result<_, _>>()?)
	}
}
