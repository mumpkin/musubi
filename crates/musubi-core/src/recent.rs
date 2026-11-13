// SPDX-License-Identifier: GPL-3.0-or-later
//! The notes modified last, for the Recent section of the explorer: by
//! modification time on disk, so that edits from other programs and sync
//! tools count.

use std::fs;
use std::time::SystemTime;

use crate::error::VaultError;
use crate::vault::Vault;

impl Vault {
	/// The `limit` notes modified last, by modification time on disk,
	/// newest first.
	///
	/// # Errors
	///
	/// An I/O error if a folder cannot be read.
	pub fn recently_modified(
		&self,
		limit: usize,
	) -> Result<Vec<String>, VaultError> {
		let mut notes: Vec<(SystemTime, String)> = self
			.tree()?
			.notes
			.into_iter()
			.map(|note| {
				let modified = fs::metadata(self.root().join(&note.path))
					.and_then(|metadata| metadata.modified())
					.unwrap_or(SystemTime::UNIX_EPOCH);
				(modified, note.path)
			})
			.collect();
		notes.sort_by(|left, right| right.cmp(left));
		Ok(notes
			.into_iter()
			.take(limit)
			.map(|(_, path)| path)
			.collect())
	}
}
