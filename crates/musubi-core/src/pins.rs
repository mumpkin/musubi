// SPDX-License-Identifier: GPL-3.0-or-later
//! Pinned notes, kept in `.musubi/vault.json` so that every copy of the
//! vault shows the same pins (`docs/vault-format.md`).

use std::fs;
use std::io;
use std::path::PathBuf;

use serde::Serialize;
use serde_json::{Map, Value};

use crate::error::VaultError;
use crate::vault::{self, FORMAT, MUSUBI_FOLDER, SETTINGS_FILE, Vault};

const PINNED: &str = "pinned";

impl Vault {
	fn settings_file(&self) -> PathBuf {
		self.root().join(MUSUBI_FOLDER).join(SETTINGS_FILE)
	}

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

	/// Rewrites `vault.json` with `pins`, keeping its other fields. A file
	/// that cannot be parsed is left alone rather than overwritten.
	fn write_pins(&self, pins: &[String]) -> Result<(), VaultError> {
		if self.read_only {
			return Err(VaultError::NewerFormat(FORMAT + 1));
		}
		let file = self.settings_file();
		let mut fields = read_fields(&file)?;
		fields.insert(PINNED.to_owned(), Value::from(pins.to_vec()));
		let temporary = file.with_extension("json.musubi-tmp");
		fs::write(&temporary, to_text(&Value::Object(fields))?)?;
		fs::rename(&temporary, &file)?;
		Ok(())
	}
}

fn read_fields(file: &PathBuf) -> Result<Map<String, Value>, VaultError> {
	let text = match fs::read_to_string(file) {
		Ok(text) => text,
		Err(error) if error.kind() == io::ErrorKind::NotFound => {
			let mut fields = Map::new();
			fields.insert("format".to_owned(), Value::from(FORMAT));
			return Ok(fields);
		}
		Err(error) => return Err(error.into()),
	};
	match serde_json::from_str(&text) {
		Ok(Value::Object(fields)) => Ok(fields),
		_ => Err(VaultError::Io(io::Error::new(
			io::ErrorKind::InvalidData,
			"the file .musubi/vault.json cannot be read",
		))),
	}
}

/// JSON indented with tabs, as Musubi writes `vault.json`.
fn to_text(value: &Value) -> Result<Vec<u8>, VaultError> {
	let mut text = Vec::new();
	let formatter = serde_json::ser::PrettyFormatter::with_indent(b"\t");
	let mut serializer =
		serde_json::Serializer::with_formatter(&mut text, formatter);
	value
		.serialize(&mut serializer)
		.map_err(|error| VaultError::Io(error.into()))?;
	text.push(b'\n');
	Ok(text)
}
