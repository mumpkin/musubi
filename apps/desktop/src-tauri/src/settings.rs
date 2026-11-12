// SPDX-License-Identifier: GPL-3.0-or-later
//! Commands of the settings screen: autosave, a setting of this device, and
//! the trash retention, a setting of the vault (`.musubi/vault.json`). The
//! theme has its own commands (`themes.rs`).

use tauri::{AppHandle, State};

use crate::state::{AppState, DeviceSettings};
use crate::vault::config_dir;

const NO_VAULT: &str = "no vault is open";
/// Bounds of the autosave delay, in seconds.
const AUTOSAVE_DELAYS: std::ops::RangeInclusive<u32> = 1..=60;
/// Longest trash retention, in days: ten years.
const MAX_RETENTION_DAYS: u64 = 3650;

/// Turns autosave on or off, after `delay_seconds` of pause in typing.
/// Returns the settings of the device.
#[tauri::command(async)]
pub fn set_autosave(
	enabled: bool,
	delay_seconds: u32,
	app: AppHandle,
) -> Result<DeviceSettings, String> {
	if !AUTOSAVE_DELAYS.contains(&delay_seconds) {
		return Err(format!(
			"the delay must be between {} and {} seconds",
			AUTOSAVE_DELAYS.start(),
			AUTOSAVE_DELAYS.end()
		));
	}
	let config = config_dir(&app)?;
	let mut settings = DeviceSettings::load(&config);
	settings.autosave = enabled;
	settings.autosave_delay_seconds = delay_seconds;
	settings.save(&config)?;
	Ok(settings)
}

/// Shows or hides the trash section of the explorer. Returns the settings
/// of the device.
#[tauri::command(async)]
pub fn set_trash_section(
	show: bool,
	app: AppHandle,
) -> Result<DeviceSettings, String> {
	let config = config_dir(&app)?;
	let mut settings = DeviceSettings::load(&config);
	settings.show_trash_section = show;
	settings.save(&config)?;
	Ok(settings)
}

/// Days before trash entries are purged; `0` keeps them.
#[tauri::command(async)]
pub fn set_trash_retention(
	days: u64,
	state: State<'_, AppState>,
) -> Result<(), String> {
	if days > MAX_RETENTION_DAYS {
		return Err(format!("at most {MAX_RETENTION_DAYS} days"));
	}
	let mut open = state.lock();
	let open = open.as_mut().ok_or(NO_VAULT)?;
	open.vault
		.set_trash_retention(days)
		.map_err(|error| error.to_string())
}
