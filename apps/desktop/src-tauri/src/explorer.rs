// SPDX-License-Identifier: GPL-3.0-or-later
//! Commands of the explorer: pinned notes, kept in the vault, recent
//! notes, by modification time, and moves of notes and folders.

use musubi_core::VaultTree;
use tauri::State;

use crate::state::{AppState, Message as _};

/// Notes listed in the "Recent" section.
const RECENT_LIMIT: usize = 4;

/// Pins or unpins the note at `path`; returns the new tree.
#[tauri::command(async)]
pub fn pin_note(
	path: &str,
	pinned: bool,
	state: State<'_, AppState>,
) -> Result<VaultTree, String> {
	state.with_open(|open| {
		open.vault
			.pin(path, pinned)
			.and_then(|()| open.vault.tree())
			.message()
	})
}

/// The notes of the open vault modified last, newest first.
#[tauri::command(async)]
pub fn recent_notes(state: State<'_, AppState>) -> Result<Vec<String>, String> {
	state.with_open(|open| open.vault.recently_modified(RECENT_LIMIT).message())
}

/// Archives the note or folder at `path` (`unarchive`: puts it back).
/// Returns its new path.
#[tauri::command(async)]
pub fn archive_entry(
	path: &str,
	unarchive: bool,
	state: State<'_, AppState>,
) -> Result<String, String> {
	state.change(|open| {
		if unarchive {
			open.vault.unarchive(path)
		} else {
			open.vault.archive(path)
		}
		.message()
	})
}

/// Gives the note at `path` a new title (heading and file name); returns
/// its new path.
#[tauri::command(async)]
pub fn retitle_note(
	path: &str,
	title: &str,
	state: State<'_, AppState>,
) -> Result<String, String> {
	state.change(|open| open.vault.retitle_note(path, title).message())
}

/// Moves the note or folder at `path` to `to` (a note keeps its file
/// name); returns its new path.
#[tauri::command(async)]
pub fn move_entry(
	path: &str,
	to: &str,
	state: State<'_, AppState>,
) -> Result<String, String> {
	state.change(|open| open.vault.move_entry(path, to).message())
}
