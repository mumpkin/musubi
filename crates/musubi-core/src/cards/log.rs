// SPDX-License-Identifier: GPL-3.0-or-later
//! The review log of the vault (`docs/vault-format.md`, "Flashcard review
//! log"): one append-only JSON Lines file per device in `.musubi/reviews/`.
//! A device only writes its own file, so sync tools never see a conflict.

use std::fs::{self, OpenOptions};
use std::io::Write as _;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::error::VaultError;
use crate::utc;
use crate::vault::{MUSUBI_FOLDER, Vault};

const REVIEWS_FOLDER: &str = "reviews";
const LOG_EXTENSION: &str = "jsonl";

/// A rating, as FSRS names them: `1` again, `2` hard, `3` good, `4` easy.
pub const RATINGS: std::ops::RangeInclusive<u8> = 1..=4;

/// One line of a log, as written in the file.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LogLine {
	card: String,
	reviewed_at: String,
	rating: u8,
}

/// A review read from the logs.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Review {
	/// Key of the card, with its direction.
	pub card: String,
	/// Seconds since the Unix epoch.
	pub at: i64,
	pub rating: u8,
}

impl Vault {
	fn reviews_folder(&self) -> PathBuf {
		self.root().join(MUSUBI_FOLDER).join(REVIEWS_FOLDER)
	}

	/// Appends a review to the log of `device`.
	///
	/// # Errors
	///
	/// [`VaultError::InvalidRating`] for a rating outside 1 to 4, a
	/// read-only vault, or an I/O error.
	pub fn record_review(
		&self,
		device: &str,
		review: &Review,
	) -> Result<(), VaultError> {
		if !RATINGS.contains(&review.rating) {
			return Err(VaultError::InvalidRating(review.rating));
		}
		let folder =
			self.writable_folder(&format!("{MUSUBI_FOLDER}/{REVIEWS_FOLDER}"))?;
		let line = LogLine {
			card: review.card.clone(),
			reviewed_at: utc::rfc3339(review.at),
			rating: review.rating,
		};
		let mut text = serde_json::to_string(&line)
			.map_err(|error| VaultError::Io(error.into()))?;
		text.push('\n');
		OpenOptions::new()
			.create(true)
			.append(true)
			.open(folder.join(format!("{device}.{LOG_EXTENSION}")))?
			.write_all(text.as_bytes())?;
		Ok(())
	}

	/// The reviews of every device. Lines that cannot be read, such as a
	/// line half-written by a sync tool, are skipped.
	///
	/// # Errors
	///
	/// An I/O error if the folder of the logs cannot be read.
	pub fn reviews(&self) -> Result<Vec<Review>, VaultError> {
		let folder = self.reviews_folder();
		if !folder.is_dir() {
			return Ok(Vec::new());
		}
		let mut reviews = Vec::new();
		for entry in fs::read_dir(folder)? {
			let path = entry?.path();
			if path
				.extension()
				.is_some_and(|extension| extension == LOG_EXTENSION)
			{
				let text = fs::read_to_string(&path).unwrap_or_default();
				reviews.extend(text.lines().filter_map(parse));
			}
		}
		Ok(reviews)
	}
}

fn parse(line: &str) -> Option<Review> {
	let line: LogLine = serde_json::from_str(line).ok()?;
	RATINGS.contains(&line.rating).then_some(())?;
	Some(Review {
		card: line.card,
		at: utc::parse_rfc3339(&line.reviewed_at)?,
		rating: line.rating,
	})
}
