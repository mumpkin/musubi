// SPDX-License-Identifier: GPL-3.0-or-later
//! Commands of the vault: open it, list, read and create notes.

use std::path::{Path, PathBuf};

use musubi_core::VaultTree;
use serde::Serialize;
use tauri::{AppHandle, Manager, State};
use ts_rs::TS;

use crate::explorer::Recent;
use crate::state::{AppState, DeviceSettings, OpenVault};

/// The open vault, as the interface sees it.
#[derive(Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct VaultInfo {
	pub root: String,
	pub name: String,
	pub read_only: bool,
	pub tree: VaultTree,
	/// The note to show first: the tutorial of a new vault.
	pub first_note: Option<String>,
}

const NO_VAULT: &str = "no vault is open";

fn info(open: &OpenVault) -> Result<VaultInfo, String> {
	let root = open.vault.root();
	Ok(VaultInfo {
		root: root.to_string_lossy().into_owned(),
		name: root
			.file_name()
			.map(|name| name.to_string_lossy().into_owned())
			.unwrap_or_default(),
		read_only: open.vault.read_only,
		tree: open.vault.tree().map_err(|error| error.to_string())?,
		first_note: None,
	})
}

pub fn config_dir(app: &AppHandle) -> Result<PathBuf, String> {
	app.path()
		.app_config_dir()
		.map_err(|error| error.to_string())
}

/// Where the indexes of vaults are kept: data of this device only.
fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
	app.path()
		.app_local_data_dir()
		.map_err(|error| error.to_string())
}

/// Opens the vault at `root` and remembers it for the next launch.
#[tauri::command(async)]
pub fn open_vault(
	root: &Path,
	app: AppHandle,
	state: State<'_, AppState>,
) -> Result<VaultInfo, String> {
	let mut open = OpenVault::open(root, &data_dir(&app)?)?;
	let first_note = welcome(&mut open)?;
	let vault_info = VaultInfo {
		first_note,
		..info(&open)?
	};
	let config = config_dir(&app)?;
	let mut settings = DeviceSettings::load(&config);
	settings.last_vault = Some(open.vault.root().to_path_buf());
	settings.save(&config)?;
	*state.lock() = Some(open);
	Ok(vault_info)
}

/// A new vault, without any note, starts with the tutorial. Returns its
/// first note.
fn welcome(open: &mut OpenVault) -> Result<Option<String>, String> {
	let tree = open.vault.tree().map_err(|error| error.to_string())?;
	if !tree.notes.is_empty() || open.vault.read_only {
		return Ok(None);
	}
	let start = open
		.vault
		.install_tutorial()
		.map_err(|error| error.to_string())?;
	open.refresh_index()?;
	Ok(Some(start.to_owned()))
}

/// Writes the notes of the tutorial that are missing; returns the path of
/// its first note.
#[tauri::command(async)]
pub fn open_tutorial(state: State<'_, AppState>) -> Result<String, String> {
	let mut open = state.lock();
	let open = open.as_mut().ok_or(NO_VAULT)?;
	let start = open
		.vault
		.install_tutorial()
		.map_err(|error| error.to_string())?;
	open.refresh_index()?;
	Ok(start.to_owned())
}

/// The vault already open, or the one of the last session if it still
/// exists.
#[tauri::command(async)]
pub fn current_vault(
	app: AppHandle,
	state: State<'_, AppState>,
) -> Result<Option<VaultInfo>, String> {
	let mut open = state.lock();
	if open.is_none() {
		let last = DeviceSettings::load(&config_dir(&app)?).last_vault;
		let data = data_dir(&app)?;
		*open = last
			.filter(|root| root.is_dir())
			.and_then(|root| OpenVault::open(&root, &data).ok());
	}
	open.as_ref().map(info).transpose()
}

/// Folders and notes of the open vault. Notes may have changed on disk:
/// the index is brought up to date first.
#[tauri::command(async)]
pub fn vault_tree(state: State<'_, AppState>) -> Result<VaultTree, String> {
	let mut open = state.lock();
	let open = open.as_mut().ok_or(NO_VAULT)?;
	open.refresh_index()?;
	open.vault.tree().map_err(|error| error.to_string())
}

#[tauri::command(async)]
pub fn read_note(
	path: &str,
	state: State<'_, AppState>,
) -> Result<String, String> {
	let open = state.lock();
	let open = open.as_ref().ok_or(NO_VAULT)?;
	open.vault
		.read_note(path)
		.map_err(|error| error.to_string())
}

/// Saves a note; renames it if its title changed. Returns its path after
/// saving.
#[tauri::command(async)]
pub fn write_note(
	path: &str,
	content: &str,
	app: AppHandle,
) -> Result<String, String> {
	let state = app.state::<AppState>();
	let mut open = state.lock();
	let open = open.as_mut().ok_or(NO_VAULT)?;
	let saved = musubi_core::save_note(&open.vault, path, content)
		.map_err(|error| error.to_string())?;
	if saved != path {
		Recent::of(&app, open.vault.root())?.rename(path, &saved)?;
	}
	open.refresh_index()?;
	Ok(saved)
}

/// Settings of this device that the interface needs.
#[tauri::command(async)]
pub fn device_settings(app: AppHandle) -> Result<DeviceSettings, String> {
	Ok(DeviceSettings::load(&config_dir(&app)?))
}

/// Creates a note in `folder`; returns its path.
#[tauri::command(async)]
pub fn create_note(
	folder: &str,
	title: &str,
	state: State<'_, AppState>,
) -> Result<String, String> {
	let open = state.lock();
	let open = open.as_ref().ok_or(NO_VAULT)?;
	open.vault
		.create_note(folder, title)
		.map_err(|error| error.to_string())
}

/// Creates a folder in `parent`; returns its path.
#[tauri::command(async)]
pub fn create_folder(
	parent: &str,
	name: &str,
	state: State<'_, AppState>,
) -> Result<String, String> {
	let open = state.lock();
	let open = open.as_ref().ok_or(NO_VAULT)?;
	open.vault
		.create_folder(parent, name)
		.map_err(|error| error.to_string())
}

/// The demo vault of the repository, for development builds.
#[tauri::command]
#[must_use]
pub fn demo_vault_path() -> Option<String> {
	cfg!(debug_assertions).then(|| {
		PathBuf::from(env!("CARGO_MANIFEST_DIR"))
			.join("../../../examples/demo-vault")
			.to_string_lossy()
			.into_owned()
	})
}
