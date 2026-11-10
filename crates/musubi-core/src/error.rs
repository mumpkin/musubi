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
	Io(io::Error),
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
			Self::Io(error) => write!(formatter, "{error}"),
		}
	}
}

impl std::error::Error for VaultError {}

impl From<io::Error> for VaultError {
	fn from(error: io::Error) -> Self {
		Self::Io(error)
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
