// SPDX-License-Identifier: GPL-3.0-or-later
//! The open vault, kept between commands, and the device settings.

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard, PoisonError};

use musubi_core::Vault;
use musubi_typst::NoteCompiler;
use serde::{Deserialize, Serialize};

/// A vault and its Typst compiler, which keeps its caches between
/// compilations.
pub struct OpenVault {
	pub vault: Vault,
	pub compiler: NoteCompiler,
}

impl OpenVault {
	pub fn open(root: &Path) -> Result<Self, String> {
		let vault = Vault::open(root).map_err(|error| error.to_string())?;
		let compiler = NoteCompiler::new(vault.root().to_path_buf());
		Ok(Self { vault, compiler })
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

/// Settings of this device, in the app config directory.
#[derive(Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceSettings {
	pub last_vault: Option<PathBuf>,
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
