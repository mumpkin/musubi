// SPDX-License-Identifier: GPL-3.0-or-later
//! The open vault, kept between commands, and the device settings.

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard, PoisonError};

use musubi_core::{Vault, VaultIndex};
use musubi_typst::NoteCompiler;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// A vault, its Typst compiler, which keeps its caches between
/// compilations, and its index.
pub struct OpenVault {
	pub vault: Vault,
	pub compiler: NoteCompiler,
	pub index: VaultIndex,
}

impl OpenVault {
	/// Opens the vault at `root` and brings its index, stored in
	/// `data_dir`, up to date.
	pub fn open(root: &Path, data_dir: &Path) -> Result<Self, String> {
		let vault = Vault::open(root).map_err(|error| error.to_string())?;
		let compiler = NoteCompiler::new(vault.root().to_path_buf());
		let index =
			VaultIndex::open(&VaultIndex::file_for(data_dir, vault.root()))
				.map_err(|error| error.to_string())?;
		let mut open = Self {
			vault,
			compiler,
			index,
		};
		open.refresh_index()?;
		Ok(open)
	}

	/// Indexes the notes changed on disk since the last refresh.
	pub fn refresh_index(&mut self) -> Result<(), String> {
		self.index
			.refresh(&self.vault, &mut self.compiler)
			.map(|_| ())
			.map_err(|error| error.to_string())
	}
}

#[derive(Default)]
pub struct AppState {
	open: Mutex<Option<OpenVault>>,
}

impl AppState {
	pub fn lock(&self) -> MutexGuard<'_, Option<OpenVault>> {
		self.open.lock().unwrap_or_else(PoisonError::into_inner)
	}
}

/// Settings of this device, in the app config directory. Unknown or
/// missing fields take their default value.
#[derive(Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase", default)]
#[ts(export)]
pub struct DeviceSettings {
	#[ts(type = "string | null")]
	pub last_vault: Option<PathBuf>,
	/// Save notes automatically after a pause in typing.
	pub autosave: bool,
	pub autosave_delay_seconds: u32,
}

const DEFAULT_AUTOSAVE_DELAY_SECONDS: u32 = 2;

impl Default for DeviceSettings {
	fn default() -> Self {
		Self {
			last_vault: None,
			autosave: false,
			autosave_delay_seconds: DEFAULT_AUTOSAVE_DELAY_SECONDS,
		}
	}
}

const SETTINGS_FILE: &str = "settings.json";

impl DeviceSettings {
	pub fn load(config: &Path) -> Self {
		fs::read_to_string(config.join(SETTINGS_FILE))
			.ok()
			.and_then(|text| serde_json::from_str(&text).ok())
			.unwrap_or_default()
	}

	pub fn save(&self, config: &Path) -> Result<(), String> {
		let text = serde_json::to_string_pretty(self)
			.map_err(|error| error.to_string())?;
		fs::create_dir_all(config).map_err(|error| error.to_string())?;
		fs::write(config.join(SETTINGS_FILE), text)
			.map_err(|error| error.to_string())
	}
}
