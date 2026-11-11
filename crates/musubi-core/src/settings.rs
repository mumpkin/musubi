// SPDX-License-Identifier: GPL-3.0-or-later
//! Writing the settings of a vault, `.musubi/vault.json`, one field at a
//! time: the other fields, known or not, are kept (`docs/vault-format.md`).

use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use serde::Serialize;
use serde_json::{Map, Value};

use crate::error::VaultError;
use crate::vault::{
	FORMAT, MUSUBI_FOLDER, SETTINGS_FILE, TRASH_RETENTION, Vault,
};

impl Vault {
	pub(crate) fn settings_file(&self) -> PathBuf {
		self.root().join(MUSUBI_FOLDER).join(SETTINGS_FILE)
	}

	/// Sets the field `key` of `vault.json` to `value`. A file that cannot
	/// be parsed is left alone rather than overwritten.
	pub(crate) fn write_setting(
		&self,
		key: &str,
		value: Value,
	) -> Result<(), VaultError> {
		if self.read_only {
			return Err(VaultError::NewerFormat(FORMAT + 1));
		}
		let file = self.settings_file();
		let mut fields = read_fields(&file)?;
		fields.insert(key.to_owned(), value);
		let temporary = file.with_extension("json.musubi-tmp");
		fs::write(&temporary, to_text(&Value::Object(fields))?)?;
		fs::rename(&temporary, &file)?;
		Ok(())
	}

	/// Days before trash entries are purged; `0` keeps them.
	///
	/// # Errors
	///
	/// A read-only vault, an unreadable `vault.json`, or an I/O error.
	pub fn set_trash_retention(&mut self, days: u64) -> Result<(), VaultError> {
		self.write_setting(TRASH_RETENTION, Value::from(days))?;
		self.trash_retention_days = days;
		Ok(())
	}
}

fn read_fields(file: &Path) -> Result<Map<String, Value>, VaultError> {
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
