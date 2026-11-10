// SPDX-License-Identifier: GPL-3.0-or-later
//! Tauri entry point: registers the commands called by the interface.

mod commands;
mod reading;

/// Starts the desktop application.
///
/// # Panics
///
/// Panics if the Tauri runtime cannot start.
pub fn run() {
	tauri::Builder::default()
		.plugin(tauri_plugin_clipboard_manager::init())
		.manage(reading::DemoVault::open())
		.invoke_handler(tauri::generate_handler![
			commands::app_info,
			reading::render_note,
		])
		.run(tauri::generate_context!())
		.expect("failed to start the Tauri application");
}
