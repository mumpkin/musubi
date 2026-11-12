// SPDX-License-Identifier: GPL-3.0-or-later
//! Commands of the explorer sections: pinned notes, kept in the vault, and
//! recent notes, kept in the settings of this device.

use std::path::{Path, PathBuf};

use musubi_core::VaultTree;
use tauri::{AppHandle, Manager, State};

use crate::state::{AppState, DeviceSettings};
use crate::vault::config_dir;

const NO_VAULT: &str = "no vault is open";
/// Notes listed in the "Recent" section.
const RECENT_LIMIT: usize = 10;

/// Pins or unpins the note at `path`; returns the new tree.
#[tauri::command(async)]
pub fn pin_note(
	path: &str,
	pinned: bool,
	state: State<'_, AppState>,
) -> Result<VaultTree, String> {
	let open = state.lock();
	let open = open.as_ref().ok_or(NO_VAULT)?;
	open.vault
		.pin(path, pinned)
		.and_then(|()| open.vault.tree())
		.map_err(|error| error.to_string())
}

/// Recent notes of the open vault on this device, newest first.
#[tauri::command(async)]
pub fn recent_notes(
	app: AppHandle,
	state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
	let open = state.lock();
	let open = open.as_ref().ok_or(NO_VAULT)?;
	Recent::of(&app, open.vault.root())?.update(|_| ())
}

/// Puts the note at `path` first in the recent notes; returns them.
#[tauri::command(async)]
pub fn note_opened(
	path: &str,
	app: AppHandle,
	state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
	let open = state.lock();
	let open = open.as_ref().ok_or(NO_VAULT)?;
	Recent::of(&app, open.vault.root())?.update(|recent| {
		recent.retain(|note| note != path);
		recent.insert(0, path.to_owned());
		recent.truncate(RECENT_LIMIT);
	})
}

/// The recent notes of one vault on this device.
pub struct Recent {
	config: PathBuf,
	vault: String,
}

impl Recent {
	pub fn of(app: &AppHandle, root: &Path) -> Result<Self, String> {
		Ok(Self {
			config: config_dir(app)?,
			vault: root.to_string_lossy().into_owned(),
		})
	}

	/// The recent note `old`, if any, becomes `new`.
	pub fn rename(&self, old: &str, new: &str) -> Result<(), String> {
		self.update(|recent| {
			for note in recent.iter_mut().filter(|note| *note == old) {
				new.clone_into(note);
			}
		})
		.map(|_| ())
	}

	/// The note at `path` leaves the recent notes.
	pub fn forget(&self, path: &str) -> Result<(), String> {
		self.update(|recent| {
			recent.retain(|note| note != path);
		})
		.map(|_| ())
	}

	/// The notes of `folder` leave the recent notes.
	pub fn forget_folder(&self, folder: &str) -> Result<(), String> {
		let prefix = format!("{folder}/");
		self.update(|recent| {
			recent.retain(|note| !note.starts_with(&prefix));
		})
		.map(|_| ())
	}

	/// After a move of `old` to `new` (a note or a folder), the recent
	/// notes follow.
	pub fn moved(&self, old: &str, new: &str) -> Result<(), String> {
		let prefix = format!("{old}/");
		self.update(|recent| {
			for note in recent.iter_mut() {
				if note == old {
					new.clone_into(note);
				} else if let Some(rest) = note.strip_prefix(&prefix) {
					*note = format!("{new}/{rest}");
				}
			}
		})
		.map(|_| ())
	}

	/// Applies `change` to the list and saves it; returns the list.
	fn update(
		&self,
		change: impl FnOnce(&mut Vec<String>),
	) -> Result<Vec<String>, String> {
		let mut settings = DeviceSettings::load(&self.config);
		let recent = settings.recent.entry(self.vault.clone()).or_default();
		let before = recent.clone();
		change(recent);
		let result = recent.clone();
		if result != before {
			settings.save(&self.config)?;
		}
		Ok(result)
	}
}

/// Archives the note or folder at `path` (`unarchive`: puts it back).
/// Returns its new path.
#[tauri::command(async)]
pub fn archive_entry(
	path: &str,
	unarchive: bool,
	app: AppHandle,
) -> Result<String, String> {
	let state = app.state::<AppState>();
	let mut open = state.lock();
	let open = open.as_mut().ok_or(NO_VAULT)?;
	let moved = if unarchive {
		open.vault.unarchive(path)
	} else {
		open.vault.archive(path)
	}
	.map_err(|error| error.to_string())?;
	Recent::of(&app, open.vault.root())?.moved(path, &moved)?;
	open.refresh_index()?;
	Ok(moved)
}

/// Gives the note at `path` a new title (heading and file name); returns
/// its new path.
#[tauri::command(async)]
pub fn retitle_note(
	path: &str,
	title: &str,
	app: AppHandle,
) -> Result<String, String> {
	let state = app.state::<AppState>();
	let mut open = state.lock();
	let open = open.as_mut().ok_or(NO_VAULT)?;
	let renamed = open
		.vault
		.retitle_note(path, title)
		.map_err(|error| error.to_string())?;
	Recent::of(&app, open.vault.root())?.moved(path, &renamed)?;
	open.refresh_index()?;
	Ok(renamed)
}

/// Moves the note or folder at `path` to `to` (a note keeps its file
/// name); returns its new path.
#[tauri::command(async)]
pub fn move_entry(
	path: &str,
	to: &str,
	app: AppHandle,
) -> Result<String, String> {
	let state = app.state::<AppState>();
	let mut open = state.lock();
	let open = open.as_mut().ok_or(NO_VAULT)?;
	let moved = open
		.vault
		.move_entry(path, to)
		.map_err(|error| error.to_string())?;
	Recent::of(&app, open.vault.root())?.moved(path, &moved)?;
	open.refresh_index()?;
	Ok(moved)
}
