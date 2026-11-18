// SPDX-License-Identifier: GPL-3.0-or-later
//! Commands of the trash: delete a note, list, restore and delete entries.

use musubi_core::TrashEntry;
use musubi_core::trash::now;
use tauri::State;

use crate::state::{AppState, Message as _};

/// Moves the note at `path` and its images to the trash.
#[tauri::command(async)]
pub fn trash_note(
	path: &str,
	state: State<'_, AppState>,
) -> Result<TrashEntry, String> {
	state.change(|open| open.vault.trash_note(path, now()).message())
}

/// Moves the folder at `path` and everything in it to the trash.
#[tauri::command(async)]
pub fn trash_folder(
	path: &str,
	state: State<'_, AppState>,
) -> Result<TrashEntry, String> {
	state.change(|open| open.vault.trash_folder(path, now()).message())
}

/// Entries of the trash, newest first.
#[tauri::command(async)]
pub fn trash_entries(
	state: State<'_, AppState>,
) -> Result<Vec<TrashEntry>, String> {
	state.with_open(|open| open.vault.trash_entries().message())
}

/// Restores entry `id`; returns the path of the note.
#[tauri::command(async)]
pub fn restore_note(
	id: &str,
	state: State<'_, AppState>,
) -> Result<String, String> {
	state.change(|open| open.vault.restore(id).message())
}

/// Deletes entry `id` for good, or every entry without `id`.
#[tauri::command(async)]
pub fn delete_trash_entries(
	id: Option<&str>,
	state: State<'_, AppState>,
) -> Result<(), String> {
	state.with_open(|open| {
		match id {
			Some(id) => open.vault.delete_trash_entry(id),
			None => open.vault.empty_trash(),
		}
		.message()
	})
}
