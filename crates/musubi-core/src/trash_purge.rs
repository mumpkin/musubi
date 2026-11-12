// SPDX-License-Identifier: GPL-3.0-or-later
//! Deleting trash entries for good: one, all, or those older than the
//! retention of the vault (`docs/vault-format.md`, "Trash").

use std::fs;

use crate::error::VaultError;
use crate::utc;
use crate::vault::Vault;

const SECONDS_PER_DAY: i64 = 86_400;

impl Vault {
	/// Deletes entry `id` for good.
	///
	/// # Errors
	///
	/// A read-only vault or an I/O error.
	pub fn delete_trash_entry(&self, id: &str) -> Result<(), VaultError> {
		self.writable_folder("")?;
		fs::remove_dir_all(self.entry_dir(id)?)?;
		Ok(())
	}

	/// Deletes every entry for good.
	///
	/// # Errors
	///
	/// A read-only vault or an I/O error.
	pub fn empty_trash(&self) -> Result<(), VaultError> {
		for entry in self.trash_entries()? {
			self.delete_trash_entry(&entry.id)?;
		}
		Ok(())
	}

	/// Deletes the entries older than `retention_days` at `now` (seconds
	/// since the epoch); `0` keeps everything. Returns how many went.
	///
	/// # Errors
	///
	/// A read-only vault or an I/O error.
	pub fn purge_trash(
		&self,
		now: i64,
		retention_days: u64,
	) -> Result<usize, VaultError> {
		if retention_days == 0 || self.read_only {
			return Ok(0);
		}
		let limit = i64::try_from(retention_days)
			.unwrap_or(i64::MAX)
			.saturating_mul(SECONDS_PER_DAY);
		let mut purged = 0;
		for entry in self.trash_entries()? {
			let is_old = utc::parse_rfc3339(&entry.deleted_at)
				.is_some_and(|deleted| now - deleted > limit);
			if is_old {
				self.delete_trash_entry(&entry.id)?;
				purged += 1;
			}
		}
		Ok(purged)
	}
}
