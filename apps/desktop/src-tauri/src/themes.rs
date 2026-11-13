// SPDX-License-Identifier: GPL-3.0-or-later
//! Commands of the color themes. The default themes ship with the
//! interface; imported themes are JSON files in the `themes` folder of the
//! app config directory: a setting of this device, not of the vault.

use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;
use ts_rs::TS;

use crate::state::DeviceSettings;
use crate::vault::config_dir;

const THEMES_FOLDER: &str = "themes";
const JSON_EXTENSION: &str = "json";
/// Ids of the themes shipped with the interface.
const DEFAULT_IDS: [&str; 4] =
	["github-light", "github-dark", "ayu-light", "ayu-mirage"];

/// A color theme, as written in its JSON file (`docs/themes.md`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Theme {
	pub name: String,
	/// `light` or `dark`: missing colors come from the default theme of
	/// the same scheme.
	pub color_scheme: ColorScheme,
	#[serde(default, skip_serializing_if = "Option::is_none")]
	#[ts(optional)]
	pub credit: Option<String>,
	/// Interface colors, by name (`background`, `accent`…).
	#[serde(default)]
	pub ui: BTreeMap<String, String>,
	/// Syntax colors of the editor and of code blocks, by token.
	#[serde(default)]
	pub syntax: BTreeMap<String, String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "lowercase")]
#[ts(export)]
pub enum ColorScheme {
	Light,
	Dark,
}

/// An imported theme and the id it is chosen by.
#[derive(Serialize, TS)]
#[ts(export)]
pub struct ThemeEntry {
	pub id: String,
	pub theme: Theme,
}

/// `#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa`: nothing else reaches the
/// CSS of the window.
fn is_hex_color(value: &str) -> bool {
	value.strip_prefix('#').is_some_and(|digits| {
		matches!(digits.len(), 3 | 4 | 6 | 8)
			&& digits.chars().all(|digit| digit.is_ascii_hexdigit())
	})
}

/// Reads a theme from JSON, refusing colors that are not hex colors and
/// names that are blank.
fn parse(text: &str) -> Result<Theme, String> {
	let theme: Theme = serde_json::from_str(text)
		.map_err(|error| format!("this is not a theme: {error}"))?;
	if theme.name.trim().is_empty() {
		return Err("the theme has no name".to_owned());
	}
	let colors = theme.ui.iter().chain(&theme.syntax);
	if let Some((key, value)) =
		colors.into_iter().find(|(_, value)| !is_hex_color(value))
	{
		return Err(format!("{key}: {value} is not a hex color"));
	}
	Ok(theme)
}

/// The file name of a theme named `name`: lowercase letters and digits
/// separated by `-`, never the id of a default theme nor of a theme
/// already there.
fn free_id(name: &str, taken: &[String]) -> String {
	let slug = name
		.split(|character: char| !character.is_alphanumeric())
		.filter(|part| !part.is_empty())
		.collect::<Vec<_>>()
		.join("-")
		.to_lowercase();
	let base = if slug.is_empty() {
		"theme".to_owned()
	} else {
		slug
	};
	let is_free = |id: &str| {
		!DEFAULT_IDS.contains(&id) && !taken.iter().any(|other| other == id)
	};
	if is_free(&base) {
		return base;
	}
	(2..)
		.map(|number| format!("{base}-{number}"))
		.find(|id| is_free(id))
		.unwrap_or(base)
}

fn themes_dir(app: &AppHandle) -> Result<PathBuf, String> {
	Ok(config_dir(app)?.join(THEMES_FOLDER))
}

/// Valid themes of `folder`, sorted by id; unreadable files are skipped.
fn read_themes(folder: &Path) -> Vec<ThemeEntry> {
	let Ok(entries) = fs::read_dir(folder) else {
		return Vec::new();
	};
	let mut themes: Vec<ThemeEntry> = entries
		.filter_map(Result::ok)
		.map(|entry| entry.path())
		.filter(|path| {
			path.extension()
				.is_some_and(|extension| extension == JSON_EXTENSION)
		})
		.filter_map(|path| {
			let id = path.file_stem()?.to_str()?.to_owned();
			let theme = parse(&fs::read_to_string(&path).ok()?).ok()?;
			Some(ThemeEntry { id, theme })
		})
		.collect();
	themes.sort_by(|left, right| left.id.cmp(&right.id));
	themes
}

/// The imported themes, sorted by id.
#[tauri::command(async)]
pub fn imported_themes(app: AppHandle) -> Result<Vec<ThemeEntry>, String> {
	Ok(read_themes(&themes_dir(&app)?))
}

/// Asks for a JSON file and imports it as a theme; `None` if cancelled.
#[tauri::command(async)]
pub fn import_theme(app: AppHandle) -> Result<Option<ThemeEntry>, String> {
	let Some(file) = app
		.dialog()
		.file()
		.set_title("Import a theme")
		.add_filter("Theme", &[JSON_EXTENSION])
		.blocking_pick_file()
	else {
		return Ok(None);
	};
	let path = file.into_path().map_err(|error| error.to_string())?;
	let text = fs::read_to_string(path).map_err(|error| error.to_string())?;
	let theme = parse(&text)?;
	let folder = themes_dir(&app)?;
	let taken: Vec<String> = read_themes(&folder)
		.into_iter()
		.map(|entry| entry.id)
		.collect();
	let id = free_id(&theme.name, &taken);
	fs::create_dir_all(&folder).map_err(|error| error.to_string())?;
	fs::write(folder.join(format!("{id}.{JSON_EXTENSION}")), text)
		.map_err(|error| error.to_string())?;
	Ok(Some(ThemeEntry { id, theme }))
}

/// Deletes the imported theme `id`. If it was the chosen theme, the theme
/// follows the system again.
#[tauri::command(async)]
pub fn remove_theme(id: &str, app: AppHandle) -> Result<(), String> {
	let folder = themes_dir(&app)?;
	if !read_themes(&folder).iter().any(|entry| entry.id == id) {
		return Err(format!("no imported theme {id}"));
	}
	fs::remove_file(folder.join(format!("{id}.{JSON_EXTENSION}")))
		.map_err(|error| error.to_string())?;
	let config = config_dir(&app)?;
	let mut settings = DeviceSettings::load(&config);
	if settings.theme.as_deref() == Some(id) {
		settings.theme = None;
		settings.save(&config)?;
	}
	Ok(())
}

/// Chooses the theme `id`, or the system preference without one.
#[tauri::command(async)]
pub fn choose_theme(id: Option<String>, app: AppHandle) -> Result<(), String> {
	let config = config_dir(&app)?;
	let mut settings = DeviceSettings::load(&config);
	settings.theme = id;
	settings.save(&config)
}

#[cfg(test)]
mod tests {
	use super::{free_id, is_hex_color, parse};

	#[test]
	fn accepts_only_hex_colors() {
		for color in ["#fff", "#ffff", "#0969da", "#0969da33"] {
			assert!(is_hex_color(color), "{color}");
		}
		for color in ["fff", "#ggg", "#12345", "red", "#fff;}", ""] {
			assert!(!is_hex_color(color), "{color}");
		}
	}

	#[test]
	fn refuses_themes_with_other_values() {
		let theme = r##"{"name": "A", "colorScheme": "dark",
			"ui": {"background": "url(x)"}}"##;
		assert!(parse(theme).is_err());
		assert!(parse(r#"{"name": " ", "colorScheme": "dark"}"#).is_err());
		assert!(parse(r#"{"name": "A", "colorScheme": "blue"}"#).is_err());
		let valid = r##"{"name": "A", "colorScheme": "light",
			"ui": {"accent": "#123456"}, "unknown": 1}"##;
		assert_eq!(parse(valid).expect("theme").ui["accent"], "#123456");
	}

	#[test]
	fn names_files_from_the_theme_name() {
		assert_eq!(free_id("Solarized Dark!", &[]), "solarized-dark");
		assert_eq!(free_id("GitHub Light", &[]), "github-light-2");
		let taken = ["nord".to_owned(), "nord-2".to_owned()];
		assert_eq!(free_id("Nord", &taken), "nord-3");
		assert_eq!(free_id("???", &[]), "theme");
	}
}
