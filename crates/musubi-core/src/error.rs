// SPDX-License-Identifier: GPL-3.0-or-later
//! Errors of vault operations, shown to the user as messages.

use std::fmt::{self, Display, Formatter};
use std::io;

use serde::{Serialize, Serializer};

#[derive(Debug)]
pub enum VaultError {
	/// A path given by the interface leads outside the vault.
	OutsideVault(String),
	/// Only `.typ` files are notes.
	NotANote(String),
	/// The vault format is newer than this version of Musubi.
	NewerFormat(u64),
	/// A note already exists at this path.
	AlreadyExists(String),
	Io(io::Error),
	/// The index could not be read or written.
	Index(rusqlite::Error),
}

impl Display for VaultError {
	fn fmt(&self, formatter: &mut Formatter<'_>) -> fmt::Result {
		match self {
			Self::OutsideVault(path) => {
				write!(formatter, "the path {path} is outside the vault")
			}
			Self::NotANote(path) => write!(formatter, "{path} is not a note"),
			Self::NewerFormat(format) => write!(
				formatter,
				"this vault uses format {format}: update Musubi to open it"
			),
			Self::AlreadyExists(path) => {
				write!(formatter, "the note {path} already exists")
			}
			Self::Io(error) => write!(formatter, "{error}"),
			Self::Index(error) => write!(formatter, "index: {error}"),
		}
	}
}

impl std::error::Error for VaultError {}

impl From<io::Error> for VaultError {
	fn from(error: io::Error) -> Self {
		Self::Io(error)
	}
}

impl From<rusqlite::Error> for VaultError {
	fn from(error: rusqlite::Error) -> Self {
		Self::Index(error)
	}
}

/// Tauri commands send errors to the interface as their message.
impl Serialize for VaultError {
	fn serialize<S: Serializer>(
		&self,
		serializer: S,
	) -> Result<S::Ok, S::Error> {
		serializer.serialize_str(&self.to_string())
	}
}
