// SPDX-License-Identifier: GPL-3.0-or-later
//! Commands of sync conflicts: the conflict copies of the vault, and their
//! resolution.

use musubi_core::{Conflict, Keep};
use tauri::State;

use crate::state::{AppState, Message as _};

/// The conflict copies made by sync tools in the open vault.
#[tauri::command(async)]
pub fn conflicts(state: State<'_, AppState>) -> Result<Vec<Conflict>, String> {
	state.with_open(|open| open.vault.conflicts().message())
}

/// Keeps one version of the note of `copy`; the other goes to the trash.
#[tauri::command(async)]
pub fn resolve_conflict(
	copy: &str,
	keep: Keep,
	state: State<'_, AppState>,
) -> Result<(), String> {
	state.change(|open| open.vault.resolve_conflict(copy, keep).message())
}
