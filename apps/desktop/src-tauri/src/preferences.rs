// SPDX-License-Identifier: GPL-3.0-or-later
//! Preferences of this device: sizes and fonts of the interface, the
//! reading view and the editor, editor options, and what opens at launch.
//! The interface applies them; this module keeps them within bounds.

use std::ops::RangeInclusive;

use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use ts_rs::TS;

use crate::state::DeviceSettings;
use crate::vault::config_dir;

/// What a vault shows when it opens.
#[derive(Serialize, Deserialize, TS, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum StartScreen {
	/// The home screen: search, recent and pinned notes.
	Home,
	/// The note modified last.
	LastNote,
}

/// Preferences of this device. Unknown or missing fields take their
/// default value.
#[derive(Serialize, Deserialize, TS, Clone, PartialEq, Eq, Debug)]
#[serde(rename_all = "camelCase", default)]
#[ts(export)]
pub struct Preferences {
	/// Size of the whole interface, in percent.
	pub interface_scale: u32,
	/// Font family of the reading view; empty for the default one.
	pub reading_font: String,
	/// Text size of the reading view, in pixels.
	pub reading_font_size: u32,
	/// Widest line of the reading view, in characters.
	pub reading_width: u32,
	/// Line height of the reading view, in percent of the text size.
	pub line_spacing: u32,
	/// Font family of the editor; empty for the default one.
	pub editor_font: String,
	/// Text size of the editor, in pixels.
	pub editor_font_size: u32,
	/// Long lines of the editor wrap.
	pub soft_wrap: bool,
	/// The line of the cursor is highlighted.
	pub highlight_cursor_line: bool,
	/// Spaces of one level of indentation.
	pub indent_width: u32,
	pub start_screen: StartScreen,
}

const DEFAULT_SCALE: u32 = 100;
const DEFAULT_READING_SIZE: u32 = 16;
const DEFAULT_READING_WIDTH: u32 = 72;
const DEFAULT_LINE_SPACING: u32 = 160;
const DEFAULT_EDITOR_SIZE: u32 = 15;
const DEFAULT_INDENT: u32 = 2;

impl Default for Preferences {
	fn default() -> Self {
		Self {
			interface_scale: DEFAULT_SCALE,
			reading_font: String::new(),
			reading_font_size: DEFAULT_READING_SIZE,
			reading_width: DEFAULT_READING_WIDTH,
			line_spacing: DEFAULT_LINE_SPACING,
			editor_font: String::new(),
			editor_font_size: DEFAULT_EDITOR_SIZE,
			soft_wrap: true,
			highlight_cursor_line: false,
			indent_width: DEFAULT_INDENT,
			start_screen: StartScreen::LastNote,
		}
	}
}

const SCALES: RangeInclusive<u32> = 50..=200;
const FONT_SIZES: RangeInclusive<u32> = 10..=32;
const READING_WIDTHS: RangeInclusive<u32> = 40..=200;
const LINE_SPACINGS: RangeInclusive<u32> = 100..=250;
const INDENT_WIDTHS: RangeInclusive<u32> = 1..=8;
/// Longest font name.
const MAX_FONT_NAME: usize = 100;

fn check(
	name: &str,
	value: u32,
	bounds: &RangeInclusive<u32>,
) -> Result<(), String> {
	if bounds.contains(&value) {
		return Ok(());
	}
	Err(format!(
		"the {name} must be between {} and {}",
		bounds.start(),
		bounds.end()
	))
}

/// A font name the CSS of the interface can take: letters, digits, spaces
/// and a few signs, nothing that could end the declaration.
fn check_font(font: &str) -> Result<(), String> {
	let is_safe = font.len() <= MAX_FONT_NAME
		&& font
			.chars()
			.all(|sign| sign.is_alphanumeric() || " -_.".contains(sign));
	if is_safe {
		Ok(())
	} else {
		Err(format!("“{font}” is not a font name"))
	}
}

impl Preferences {
	/// Checks that every preference is within its bounds.
	///
	/// # Errors
	///
	/// A message naming the first preference out of bounds.
	pub fn validate(&self) -> Result<(), String> {
		check("interface size", self.interface_scale, &SCALES)?;
		check("reading text size", self.reading_font_size, &FONT_SIZES)?;
		check("reading width", self.reading_width, &READING_WIDTHS)?;
		check("line spacing", self.line_spacing, &LINE_SPACINGS)?;
		check("editor text size", self.editor_font_size, &FONT_SIZES)?;
		check("indent width", self.indent_width, &INDENT_WIDTHS)?;
		check_font(&self.reading_font)?;
		check_font(&self.editor_font)
	}
}

/// Replaces the preferences of this device. Returns its settings.
#[tauri::command(async)]
pub fn set_preferences(
	preferences: Preferences,
	app: AppHandle,
) -> Result<DeviceSettings, String> {
	preferences.validate()?;
	let config = config_dir(&app)?;
	let mut settings = DeviceSettings::load(&config);
	settings.preferences = preferences;
	settings.save(&config)?;
	Ok(settings)
}

#[cfg(test)]
mod tests {
	use super::{Preferences, StartScreen};

	#[test]
	fn the_defaults_are_valid() {
		assert_eq!(Preferences::default().validate(), Ok(()));
	}

	#[test]
	fn refuses_values_out_of_bounds() {
		let tiny = Preferences {
			reading_font_size: 2,
			..Preferences::default()
		};
		assert!(tiny.validate().is_err());
		let wide = Preferences {
			indent_width: 9,
			..Preferences::default()
		};
		assert!(wide.validate().is_err());
	}

	#[test]
	fn refuses_fonts_that_could_break_the_css() {
		let font = |name: &str| Preferences {
			editor_font: name.to_owned(),
			..Preferences::default()
		};
		assert_eq!(font("JetBrains Mono").validate(), Ok(()));
		assert!(font("x; color: red").validate().is_err());
		assert!(font("a\"b").validate().is_err());
	}

	#[test]
	fn missing_fields_take_their_default() {
		let read: Preferences =
			serde_json::from_str(r#"{"startScreen":"home"}"#).expect("json");
		assert_eq!(read.start_screen, StartScreen::Home);
		assert_eq!(read.indent_width, Preferences::default().indent_width);
	}
}
