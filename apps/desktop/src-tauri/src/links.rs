// SPDX-License-Identifier: GPL-3.0-or-later
//! Commands of links and search: backlinks, following a link to a note
//! that does not exist yet, searching titles, headings and text.

use musubi_core::{Backlink, Graph, NoteMatch, TextMatch};
use tauri::State;

use crate::state::{AppState, Message as _};

/// Notes linking to the note at `path`.
#[tauri::command(async)]
pub fn backlinks(
	path: &str,
	state: State<'_, AppState>,
) -> Result<Vec<Backlink>, String> {
	state.with_open(|open| open.index.backlinks(path).message())
}

/// Creates the missing note at `path`, the target of a link, titled
/// `title`.
#[tauri::command(async)]
pub fn create_linked_note(
	path: &str,
	title: &str,
	state: State<'_, AppState>,
) -> Result<(), String> {
	state.change(|open| open.vault.create_note_at(path, title).message())
}

/// Points every link to the target `from` at `to` (paths without
/// extension), a note that exists under a near name.
#[tauri::command(async)]
pub fn retarget_links(
	from: &str,
	to: &str,
	state: State<'_, AppState>,
) -> Result<(), String> {
	state.change(|open| {
		musubi_core::retarget_links(&open.vault, from, to).message()
	})
}

/// Notes whose title fuzzily matches `query`, best first.
#[tauri::command(async)]
pub fn search_notes(
	query: &str,
	state: State<'_, AppState>,
) -> Result<Vec<NoteMatch>, String> {
	state.with_open(|open| {
		// The titles of the index: no listing of the vault at each keystroke.
		let notes = open.index.notes().message()?;
		Ok(musubi_core::search_titles(&notes, query))
	})
}

/// Headings of the note at `path` matching `query`: the sections a link
/// can target.
#[tauri::command(async)]
pub fn search_sections(
	path: &str,
	query: &str,
	state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
	state.with_open(|open| {
		let source = open.vault.read_note(path).message()?;
		let headings = musubi_core::title::headings(&source);
		Ok(musubi_core::search_headings(&headings, query))
	})
}

/// Passages of notes containing every word of `text`, best first.
#[tauri::command(async)]
pub fn search_text(
	text: &str,
	state: State<'_, AppState>,
) -> Result<Vec<TextMatch>, String> {
	state.with_open(|open| open.index.search_text(text).message())
}

/// Notes and links of the vault, for the graph view.
#[tauri::command(async)]
pub fn vault_graph(state: State<'_, AppState>) -> Result<Graph, String> {
	state.with_open(|open| open.index.graph().message())
}
