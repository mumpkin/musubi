// SPDX-License-Identifier: GPL-3.0-or-later
//! Commands of links between notes: backlinks, and following a link to a
//! note that does not exist yet.

use musubi_core::Backlink;
use tauri::State;

use crate::state::AppState;

const NO_VAULT: &str = "no vault is open";

/// Notes linking to the note at `path`.
#[tauri::command(async)]
pub fn backlinks(
	path: &str,
	state: State<'_, AppState>,
) -> Result<Vec<Backlink>, String> {
	let open = state.lock();
	let open = open.as_ref().ok_or(NO_VAULT)?;
	open.index
		.backlinks(path)
		.map_err(|error| error.to_string())
}

/// Creates the missing note at `path`, the target of a link, titled
/// `title`.
#[tauri::command(async)]
pub fn create_linked_note(
	path: &str,
	title: &str,
	state: State<'_, AppState>,
) -> Result<(), String> {
	let mut open = state.lock();
	let open = open.as_mut().ok_or(NO_VAULT)?;
	open.vault
		.create_note_at(path, title)
		.map_err(|error| error.to_string())?;
	open.refresh_index()
}
