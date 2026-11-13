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

/// Seconds since the epoch of the last local midnight before `now`: the
/// day of the limit on new cards follows the clock of the user.
#[must_use]
pub fn local_day_start(now: i64) -> i64 {
	chrono::DateTime::from_timestamp(now, 0)
		.map(|time| time.with_timezone(&chrono::Local))
		.and_then(|time| {
			time.date_naive()
				.and_hms_opt(0, 0, 0)?
				.and_local_timezone(chrono::Local)
				.earliest()
		})
		.map_or(now, |midnight| midnight.timestamp())
}

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
