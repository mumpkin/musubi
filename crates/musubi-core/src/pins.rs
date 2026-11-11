// SPDX-License-Identifier: GPL-3.0-or-later
//! Pinned notes, kept in `.musubi/vault.json` so that every copy of the
//! vault shows the same pins (`docs/vault-format.md`).

use serde_json::Value;

use crate::error::VaultError;
use crate::vault::{self, Vault};

const PINNED: &str = "pinned";

impl Vault {
	/// Paths of the pinned notes, in order, as written in `vault.json`:
	/// some may point to notes that no longer exist.
	#[must_use]
	pub fn pinned(&self) -> Vec<String> {
		vault::read_settings(&self.settings_file())
			.get(PINNED)
			.and_then(Value::as_array)
			.map(|pins| {
				pins.iter()
					.filter_map(Value::as_str)
					.map(str::to_owned)
					.collect()
			})
			.unwrap_or_default()
	}

	/// Pins `note` after the other pins, or unpins it.
	///
	/// # Errors
	///
	/// A read-only vault, an unreadable `vault.json`, or an I/O error.
	pub fn pin(&self, note: &str, pinned: bool) -> Result<(), VaultError> {
		let mut pins = self.pinned();
		pins.retain(|pin| pin != note);
		if pinned {
			pins.push(note.to_owned());
		}
		self.write_pins(&pins)
	}

	/// The pin of `old`, if any, follows the note renamed to `new`.
	pub(crate) fn rename_pin(
		&self,
		old: &str,
		new: &str,
	) -> Result<(), VaultError> {
		let pins = self.pinned();
		if !pins.iter().any(|pin| pin == old) {
			return Ok(());
		}
		let renamed: Vec<String> = pins
			.into_iter()
			.map(|pin| if pin == old { new.to_owned() } else { pin })
			.collect();
		self.write_pins(&renamed)
	}

	/// Removes the pin of `note`, if any.
	pub(crate) fn unpin(&self, note: &str) -> Result<(), VaultError> {
		if self.pinned().iter().any(|pin| pin == note) {
			self.pin(note, false)
		} else {
			Ok(())
		}
	}

	fn write_pins(&self, pins: &[String]) -> Result<(), VaultError> {
		self.write_setting(PINNED, Value::from(pins.to_vec()))
	}
}
