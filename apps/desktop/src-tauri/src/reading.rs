// SPDX-License-Identifier: GPL-3.0-or-later
//! Commands of the reading view: compiling a note to HTML, switching a
//! task.

use std::time::Instant;

use musubi_typst::RenderedNote;
use serde::Serialize;
use tauri::State;
use ts_rs::TS;

use crate::state::AppState;

const MILLISECONDS_PER_SECOND: f64 = 1000.0;

/// A rendered note, with the time the compilation took.
#[derive(Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct NoteView {
	pub note: RenderedNote,
	pub compile_milliseconds: f64,
}

/// Compiles the note at `path` (from the vault root, with extension) to
/// HTML. Runs outside the main thread so that the window stays responsive.
#[tauri::command(async)]
pub fn render_note(
	path: &str,
	state: State<'_, AppState>,
) -> Result<NoteView, String> {
	let mut open = state.lock();
	let open = open.as_mut().ok_or("no vault is open")?;
	let start = Instant::now();
	let note = open.compiler.render(path);
	Ok(NoteView {
		note,
		compile_milliseconds: start.elapsed().as_secs_f64()
			* MILLISECONDS_PER_SECOND,
	})
}

/// Switches the task whose function name starts at byte `offset` of the
/// note at `path` between `todo` and `done`, and saves the note.
#[tauri::command(async)]
pub fn toggle_task(
	path: &str,
	offset: usize,
	state: State<'_, AppState>,
) -> Result<(), String> {
	let mut open = state.lock();
	let open = open.as_mut().ok_or("no vault is open")?;
	let text = open
		.vault
		.read_note(path)
		.map_err(|error| error.to_string())?;
	let toggled = musubi_core::toggle_task(&text, offset)
		.ok_or("the task is no longer there: the note changed")?;
	open.vault
		.write_note(path, &toggled)
		.map_err(|error| error.to_string())?;
	open.refresh_index()
}
