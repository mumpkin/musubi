// SPDX-License-Identifier: GPL-3.0-or-later
//! Commands of flashcard reviews: the cards due in a scope, and a review
//! appended to the log of this device (`docs/vault-format.md`).

use std::collections::hash_map::RandomState;
use std::fs;
use std::hash::{BuildHasher, Hasher};

use musubi_core::cards::{Review, local_day_start};
use musubi_core::trash::now;
use musubi_core::{DueCard, DueRequest, ReviewClock};
use tauri::{AppHandle, Manager, State};

use crate::state::{AppState, DeviceSettings};
use crate::vault::config_dir;

const NO_VAULT: &str = "no vault is open";
const DEVICE_FILE: &str = "device-id";

/// The id of this installation: 16 random hex digits, made once and kept
/// in the local data of the app, never in the vault.
fn device_id(app: &AppHandle) -> Result<String, String> {
	let folder = app
		.path()
		.app_local_data_dir()
		.map_err(|error| error.to_string())?;
	let file = folder.join(DEVICE_FILE);
	if let Ok(id) = fs::read_to_string(&file) {
		let id = id.trim();
		if id.len() == 16 && id.chars().all(|digit| digit.is_ascii_hexdigit()) {
			return Ok(id.to_owned());
		}
	}
	// A randomly seeded hasher gives 64 random bits without a dependency.
	let id = format!("{:016x}", RandomState::new().build_hasher().finish());
	fs::create_dir_all(&folder).map_err(|error| error.to_string())?;
	fs::write(&file, &id).map_err(|error| error.to_string())?;
	Ok(id)
}

/// The cards to review in `scope`: `""` for the vault, a folder or a note.
#[tauri::command(async)]
pub fn due_cards(
	scope: &str,
	app: AppHandle,
	state: State<'_, AppState>,
) -> Result<Vec<DueCard>, String> {
	let settings = DeviceSettings::load(&config_dir(&app)?);
	let time = now();
	let clock = ReviewClock {
		now: time,
		day_start: local_day_start(time),
		new_per_day: settings.new_cards_per_day as usize,
	};
	let open = state.lock();
	let open = open.as_ref().ok_or(NO_VAULT)?;
	open.vault
		.due_cards(&open.index, DueRequest { scope, clock })
		.map_err(|error| error.to_string())
}

/// Records the review of card `key` with `rating` (1 again to 4 easy).
#[tauri::command(async)]
pub fn review_card(
	key: String,
	rating: u8,
	app: AppHandle,
) -> Result<(), String> {
	let device = device_id(&app)?;
	let state = app.state::<AppState>();
	let open = state.lock();
	let open = open.as_ref().ok_or(NO_VAULT)?;
	let review = Review {
		card: key,
		at: now(),
		rating,
	};
	open.vault
		.record_review(&device, &review)
		.map_err(|error| error.to_string())
}
