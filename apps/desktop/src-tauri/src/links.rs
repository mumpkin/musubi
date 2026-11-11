// SPDX-License-Identifier: GPL-3.0-or-later
//! Commands of links and search: backlinks, following a link to a note
//! that does not exist yet, searching titles, headings and text.

use musubi_core::{Backlink, Graph, NoteMatch, TextMatch};
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

/// Notes whose title fuzzily matches `query`, best first.
#[tauri::command(async)]
pub fn search_notes(
	query: &str,
	state: State<'_, AppState>,
) -> Result<Vec<NoteMatch>, String> {
	let open = state.lock();
	let open = open.as_ref().ok_or(NO_VAULT)?;
	let notes = open.vault.tree().map_err(|error| error.to_string())?.notes;
	Ok(musubi_core::search_titles(&notes, query))
}

/// Headings of the note at `path` matching `query`: the sections a link
/// can target.
#[tauri::command(async)]
pub fn search_sections(
	path: &str,
	query: &str,
	state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
	let open = state.lock();
	let open = open.as_ref().ok_or(NO_VAULT)?;
	let source = open
		.vault
		.read_note(path)
		.map_err(|error| error.to_string())?;
	let headings = musubi_core::title::headings(&source);
	Ok(musubi_core::search_headings(&headings, query))
}

/// Passages of notes containing every word of `text`, best first.
#[tauri::command(async)]
pub fn search_text(
	text: &str,
	state: State<'_, AppState>,
) -> Result<Vec<TextMatch>, String> {
	let open = state.lock();
	let open = open.as_ref().ok_or(NO_VAULT)?;
	open.index
		.search_text(text)
		.map_err(|error| error.to_string())
}

/// Notes and links of the vault, for the graph view.
#[tauri::command(async)]
pub fn vault_graph(state: State<'_, AppState>) -> Result<Graph, String> {
	let open = state.lock();
	let open = open.as_ref().ok_or(NO_VAULT)?;
	open.index.graph().map_err(|error| error.to_string())
}
