// SPDX-License-Identifier: GPL-3.0-or-later
//! Tauri entry point: registers the commands called by the interface.

mod commands;

/// Starts the desktop application.
///
/// # Panics
///
/// Panics if the Tauri runtime cannot start.
pub fn run() {
	tauri::Builder::default()
		.invoke_handler(tauri::generate_handler![commands::app_info])
		.run(tauri::generate_context!())
		.expect("failed to start the Tauri application");
}
