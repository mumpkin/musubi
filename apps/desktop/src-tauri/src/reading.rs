// SPDX-License-Identifier: GPL-3.0-or-later
//! Commands of the reading view: compiling a note to HTML.

use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Instant;

use musubi_typst::{NoteCompiler, RenderedNote};
use serde::Serialize;
use tauri::State;
use ts_rs::TS;

/// Compiler of the demo vault. Kept in the Tauri state so that Typst reuses
/// its caches between compilations.
pub struct DemoVault(Mutex<NoteCompiler>);

impl DemoVault {
	/// Opens `examples/demo-vault` from the repository. Prototype only: the
	/// interface cannot choose a vault yet.
	pub fn open() -> Self {
		let vault = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
			.join("../../../examples/demo-vault");
		Self(Mutex::new(NoteCompiler::new(vault)))
	}
}

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
pub fn render_note(path: &str, vault: State<'_, DemoVault>) -> NoteView {
	let start = Instant::now();
	let note = vault
		.0
		.lock()
		.unwrap_or_else(std::sync::PoisonError::into_inner)
		.render(path);
	NoteView {
		note,
		compile_milliseconds: start.elapsed().as_secs_f64()
			* MILLISECONDS_PER_SECOND,
	}
}
