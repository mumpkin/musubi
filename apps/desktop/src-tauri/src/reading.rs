// SPDX-License-Identifier: GPL-3.0-or-later
//! Commands of the reading view: compiling a note to HTML.

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
