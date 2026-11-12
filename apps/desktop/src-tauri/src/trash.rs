// SPDX-License-Identifier: GPL-3.0-or-later
//! Commands of the trash: delete a note, list, restore and delete entries.

use musubi_core::TrashEntry;
use musubi_core::trash::now;
use tauri::{AppHandle, State};

use crate::explorer::Recent;
use crate::state::AppState;

const NO_VAULT: &str = "no vault is open";

/// Moves the note at `path` and its images to the trash.
#[tauri::command(async)]
pub fn trash_note(
	path: &str,
	app: AppHandle,
	state: State<'_, AppState>,
) -> Result<TrashEntry, String> {
	let mut open = state.lock();
	let open = open.as_mut().ok_or(NO_VAULT)?;
	let entry = open
		.vault
		.trash_note(path, now())
		.map_err(|error| error.to_string())?;
	Recent::of(&app, open.vault.root())?.forget(path)?;
	open.refresh_index()?;
	Ok(entry)
}

/// Moves the folder at `path` and everything in it to the trash.
#[tauri::command(async)]
pub fn trash_folder(
	path: &str,
	app: AppHandle,
	state: State<'_, AppState>,
) -> Result<TrashEntry, String> {
	let mut open = state.lock();
	let open = open.as_mut().ok_or(NO_VAULT)?;
	let entry = open
		.vault
		.trash_folder(path, now())
		.map_err(|error| error.to_string())?;
	Recent::of(&app, open.vault.root())?.forget_folder(path)?;
	open.refresh_index()?;
	Ok(entry)
}

/// Entries of the trash, newest first.
#[tauri::command(async)]
pub fn trash_entries(
	state: State<'_, AppState>,
) -> Result<Vec<TrashEntry>, String> {
	let open = state.lock();
	let open = open.as_ref().ok_or(NO_VAULT)?;
	open.vault
		.trash_entries()
		.map_err(|error| error.to_string())
}

/// Restores entry `id`; returns the path of the note.
#[tauri::command(async)]
pub fn restore_note(
	id: &str,
	state: State<'_, AppState>,
) -> Result<String, String> {
	let mut open = state.lock();
	let open = open.as_mut().ok_or(NO_VAULT)?;
	let path = open.vault.restore(id).map_err(|error| error.to_string())?;
	open.refresh_index()?;
	Ok(path)
}

/// Deletes entry `id` for good, or every entry without `id`.
#[tauri::command(async)]
pub fn delete_trash_entries(
	id: Option<&str>,
	state: State<'_, AppState>,
) -> Result<(), String> {
	let open = state.lock();
	let open = open.as_ref().ok_or(NO_VAULT)?;
	match id {
		Some(id) => open.vault.delete_trash_entry(id),
		None => open.vault.empty_trash(),
	}
	.map_err(|error| error.to_string())
}
