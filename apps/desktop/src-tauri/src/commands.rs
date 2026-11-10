// SPDX-License-Identifier: GPL-3.0-or-later
//! Commands called by the interface through `invoke`.

use serde::Serialize;
use ts_rs::TS;

/// Name and version shown by the interface.
#[derive(Serialize, TS)]
#[ts(export)]
pub struct AppInfo {
	pub name: String,
	pub version: String,
}

/// Returns the application name and the core version.
#[tauri::command]
#[must_use]
pub fn app_info() -> AppInfo {
	AppInfo {
		name: String::from("Musubi"),
		version: String::from(musubi_core::version()),
	}
}

#[cfg(test)]
mod tests {
	use super::app_info;

	#[test]
	fn app_info_reports_the_core_version() {
		assert_eq!(app_info().version, musubi_core::version());
	}
}
