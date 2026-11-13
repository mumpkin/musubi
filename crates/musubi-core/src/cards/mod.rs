// SPDX-License-Identifier: GPL-3.0-or-later
//! Flashcards: their keys, the review log of each device, and the schedule
//! computed from them (`docs/vault-format.md`, "Flashcard review log").

mod key;
mod log;
mod schedule;

pub use self::key::{Direction, card_key, question_hash, question_sources};
pub use self::log::{RATINGS, Review};
pub use self::schedule::{DueCard, ReviewClock, Schedule};
use crate::error::VaultError;
use crate::index::VaultIndex;
use crate::vault::Vault;

/// Hour at which a new day of reviews starts, as Anki: 4 a.m.
const DAY_START_HOUR: u32 = 4;

/// Seconds since the epoch of the start of the day of reviews holding
/// `now`: the last 4 a.m. local time, as Anki, so that a late review
/// still counts for the day before.
#[must_use]
pub fn local_day_start(now: i64) -> i64 {
	let Some(time) = chrono::DateTime::from_timestamp(now, 0)
		.map(|time| time.with_timezone(&chrono::Local))
	else {
		return now;
	};
	let today = time
		.date_naive()
		.and_hms_opt(DAY_START_HOUR, 0, 0)
		.and_then(|start| start.and_local_timezone(chrono::Local).earliest())
		.map_or(now, |start| start.timestamp());
	if today <= now {
		today
	} else {
		today - SECONDS_PER_DAY
	}
}

const SECONDS_PER_DAY: i64 = 86_400;

/// Which cards to review: a scope (see [`VaultIndex::cards`]) and when.
#[derive(Debug, Clone, Copy)]
pub struct DueRequest<'scope> {
	pub scope: &'scope str,
	pub clock: ReviewClock,
}

impl Vault {
	/// The cards to review for `request`.
	///
	/// # Errors
	///
	/// An I/O error reading the logs, or a SQLite error.
	pub fn due_cards(
		&self,
		index: &VaultIndex,
		request: DueRequest<'_>,
	) -> Result<Vec<DueCard>, VaultError> {
		let schedule = Schedule::replay(self.reviews()?);
		Ok(schedule.due(&index.cards(request.scope)?, request.clock))
	}
}
