// SPDX-License-Identifier: GPL-3.0-or-later
//! Tauri entry point: registers the commands called by the interface.

mod assets;
mod commands;
mod explorer;
mod links;
mod reading;
mod settings;
mod state;
mod themes;
mod trash;
mod vault;

/// The commands called by the interface. A list, not logic: it stays out
/// of `run` so that the function keeps to the length limit.
macro_rules! commands {
	() => {
		tauri::generate_handler![
			commands::app_info,
			reading::render_note,
			vault::open_vault,
			vault::known_vaults,
			vault::current_vault,
			vault::vault_tree,
			vault::read_note,
			vault::write_note,
			vault::device_settings,
			vault::create_note,
			vault::create_folder,
			vault::demo_vault_path,
			vault::open_tutorial,
			links::backlinks,
			links::create_linked_note,
			links::search_notes,
			links::search_sections,
			links::search_text,
			links::vault_graph,
			assets::import_image,
			assets::paste_image,
			assets::note_assets,
			trash::trash_note,
			trash::trash_folder,
			trash::trash_entries,
			trash::restore_note,
			trash::delete_trash_entries,
			explorer::pin_note,
			explorer::recent_notes,
			explorer::archive_entry,
			explorer::retitle_note,
			explorer::move_entry,
			themes::imported_themes,
			themes::import_theme,
			themes::remove_theme,
			themes::choose_theme,
			settings::set_autosave,
			settings::set_trash_section,
			settings::set_trash_retention,
		]
	};
}

/// Starts the desktop application.
///
/// # Panics
///
/// Panics if the Tauri runtime cannot start.
pub fn run() {
	tauri::Builder::default()
		.plugin(tauri_plugin_clipboard_manager::init())
		.plugin(tauri_plugin_dialog::init())
		.plugin(tauri_plugin_opener::init())
		.manage(state::AppState::default())
		.invoke_handler(commands!())
		.run(tauri::generate_context!())
		.expect("failed to start the Tauri application");
}
