// SPDX-License-Identifier: GPL-3.0-or-later
//! Tauri entry point: registers the commands called by the interface.

mod assets;
mod commands;
mod links;
mod reading;
mod state;
mod vault;

/// Starts the desktop application.
///
/// # Panics
///
/// Panics if the Tauri runtime cannot start.
pub fn run() {
	tauri::Builder::default()
		.plugin(tauri_plugin_clipboard_manager::init())
		.plugin(tauri_plugin_dialog::init())
		.manage(state::AppState::default())
		.invoke_handler(tauri::generate_handler![
			commands::app_info,
			reading::render_note,
			vault::open_vault,
			vault::current_vault,
			vault::vault_tree,
			vault::read_note,
			vault::write_note,
			vault::device_settings,
			vault::create_note,
			vault::create_folder,
			vault::demo_vault_path,
			links::backlinks,
			links::create_linked_note,
			links::search_notes,
			links::search_sections,
			links::search_text,
			assets::import_image,
			assets::paste_image,
			assets::note_assets,
		])
		.run(tauri::generate_context!())
		.expect("failed to start the Tauri application");
}
