// SPDX-License-Identifier: GPL-3.0-or-later
//! Commands of sync conflicts: the conflict copies of the vault, and their
//! resolution.

use musubi_core::{Conflict, Keep};
use tauri::State;

use crate::state::AppState;

const NO_VAULT: &str = "no vault is open";

/// The conflict copies made by sync tools in the open vault.
#[tauri::command(async)]
pub fn conflicts(state: State<'_, AppState>) -> Result<Vec<Conflict>, String> {
	let open = state.lock();
	let open = open.as_ref().ok_or(NO_VAULT)?;
	open.vault.conflicts().map_err(|error| error.to_string())
}

/// Keeps one version of the note of `copy`; the other goes to the trash.
#[tauri::command(async)]
pub fn resolve_conflict(
	copy: &str,
	keep: Keep,
	state: State<'_, AppState>,
) -> Result<(), String> {
	let mut open = state.lock();
	let open = open.as_mut().ok_or(NO_VAULT)?;
	open.vault
		.resolve_conflict(copy, keep)
		.map_err(|error| error.to_string())?;
	open.refresh_index()
}
