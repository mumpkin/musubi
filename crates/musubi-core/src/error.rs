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
	/// A path typed by the user has an empty, `.` or `..` part.
	InvalidPath(String),
	/// A review rating is between 1 and 4.
	InvalidRating(u8),
	/// A folder cannot move into one of its own folders.
	IntoItself(String),
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
			Self::NotANote(path) => {
				write!(formatter, "the file {path} is not a note")
			}
			Self::NewerFormat(format) => write!(
				formatter,
				"this vault uses format {format}: update Musubi to open it"
			),
			Self::AlreadyExists(path) => {
				write!(formatter, "the note {path} already exists")
			}
			Self::InvalidPath(path) => {
				write!(formatter, "each folder of the path {path} needs a name")
			}
			Self::InvalidRating(rating) => {
				write!(formatter, "invalid rating {rating}: use 1 to 4")
			}
			Self::IntoItself(path) => {
				write!(formatter, "the folder {path} cannot move into itself")
			}
			Self::Io(error) => write!(formatter, "{}", io_message(error)),
			Self::Index(error) => write!(
				formatter,
				"the index of the vault could not be read or written \
				 ({error}); close and open the vault again"
			),
		}
	}
}

/// What went wrong with a file, in words a user can act on; the message
/// of the system follows, for the details.
fn io_message(error: &io::Error) -> String {
	use io::ErrorKind;
	let what = match error.kind() {
		ErrorKind::NotFound => {
			"a file is missing: it may have been moved or deleted outside \
			 Musubi"
		}
		ErrorKind::PermissionDenied => {
			"Musubi may not read or write this file: check its permissions"
		}
		ErrorKind::IsADirectory => "a folder stands where a note was expected",
		ErrorKind::NotADirectory => "a file stands where a folder was expected",
		ErrorKind::AlreadyExists => "a file with this name already exists",
		ErrorKind::StorageFull => "the disk is full",
		ErrorKind::ReadOnlyFilesystem => "the vault is on a read-only disk",
		ErrorKind::InvalidFilename => "the system does not allow this name",
		ErrorKind::InvalidData => "a file is not valid UTF-8 text",
		_ => "the vault could not be read or written",
	};
	format!("{what} ({error})")
}

/// The message of a file error met outside the vault operations.
#[must_use]
pub fn file_error(error: io::Error) -> String {
	io_message(&error)
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

#[cfg(test)]
mod tests {
	use std::io;

	use super::VaultError;

	#[test]
	fn explains_file_errors_before_the_system_message() {
		let error = VaultError::from(io::Error::new(
			io::ErrorKind::PermissionDenied,
			"Permission denied (os error 13)",
		));
		assert_eq!(
			error.to_string(),
			"Musubi may not read or write this file: check its permissions \
			 (Permission denied (os error 13))"
		);
	}
}
