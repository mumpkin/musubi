// SPDX-License-Identifier: GPL-3.0-or-later
//! Commands of the files of a note: images dropped or pasted into the
//! editor are copied into its `.assets` folder.

use std::fs;
use std::path::Path;

use musubi_core::NewAsset;
use percent_encoding::percent_decode_str;
use tauri::State;
use tauri::ipc::{InvokeBody, Request};

use crate::state::AppState;

const NO_VAULT: &str = "no vault is open";

fn not_an_image(name: &str) -> String {
	format!("{name} is not an image Musubi can show")
}

/// Copies the image at `source`, dropped on the editor of `note`; returns
/// the path to write in the note.
#[tauri::command(async)]
pub fn import_image(
	note: &str,
	source: &Path,
	state: State<'_, AppState>,
) -> Result<String, String> {
	let name = source
		.file_name()
		.map(|name| name.to_string_lossy().into_owned())
		.unwrap_or_default();
	if !musubi_core::is_image(&name) {
		return Err(not_an_image(&name));
	}
	let bytes = fs::read(source).map_err(|error| error.to_string())?;
	let open = state.lock();
	let open = open.as_ref().ok_or(NO_VAULT)?;
	open.vault
		.add_asset(
			note,
			&NewAsset {
				name: &name,
				bytes: &bytes,
			},
		)
		.map_err(|error| error.to_string())
}

/// A header of `request`, percent-decoded: headers carry only ASCII.
fn header(request: &Request<'_>, name: &str) -> Result<String, String> {
	let value = request
		.headers()
		.get(name)
		.and_then(|value| value.to_str().ok())
		.ok_or_else(|| format!("missing header {name}"))?;
	Ok(percent_decode_str(value).decode_utf8_lossy().into_owned())
}

/// Copies a pasted image: its bytes are the body of the request, the note
/// and the file name its `note` and `name` headers. Returns the path to
/// write in the note.
#[tauri::command(async)]
pub fn paste_image(
	request: Request<'_>,
	state: State<'_, AppState>,
) -> Result<String, String> {
	let InvokeBody::Raw(bytes) = request.body() else {
		return Err(String::from("the image must be sent as bytes"));
	};
	let note = header(&request, "note")?;
	let name = header(&request, "name")?;
	if !musubi_core::is_image(&name) {
		return Err(not_an_image(&name));
	}
	let open = state.lock();
	let open = open.as_ref().ok_or(NO_VAULT)?;
	open.vault
		.add_asset(&note, &NewAsset { name: &name, bytes })
		.map_err(|error| error.to_string())
}

/// Files of the `.assets` folder of `note`, relative to it.
#[tauri::command(async)]
pub fn note_assets(
	note: &str,
	state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
	let open = state.lock();
	let open = open.as_ref().ok_or(NO_VAULT)?;
	open.vault.assets(note).map_err(|error| error.to_string())
}
