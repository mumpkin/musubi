// SPDX-License-Identifier: GPL-3.0-or-later
//! When each card is due, computed with FSRS by replaying the reviews of
//! every device in time order: every device finds the same schedule.

use std::collections::{HashMap, HashSet};

use chrono::{DateTime, TimeDelta, Utc};
use rs_fsrs::{Card, FSRS, Rating};
use serde::Serialize;
use ts_rs::TS;

use super::key::{Direction, card_key};
use super::log::Review;
use crate::index::IndexedCard;

/// A card to review now, in one direction.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DueCard {
	/// Key of the card with its direction, for the review log.
	pub key: String,
	/// Note of the card, and its rank among the cards of the note.
	pub note: String,
	#[ts(type = "number")]
	pub position: i64,
	/// Reviewed from the answer to the question.
	pub is_reverse: bool,
	pub question: String,
	pub answer: String,
	/// Never reviewed yet.
	pub is_new: bool,
}

/// When cards are due: the time now and the start of the day, in seconds
/// since the epoch, and how many new cards a day may bring.
#[derive(Debug, Clone, Copy)]
pub struct ReviewClock {
	pub now: i64,
	pub day_start: i64,
	pub new_per_day: usize,
}

/// The state of a reviewed card, and the time of its first review.
struct Reviewed {
	card: Card,
	first: i64,
}

fn time(seconds: i64) -> DateTime<Utc> {
	DateTime::from_timestamp(seconds, 0).unwrap_or_default()
}

fn rating(value: u8) -> Rating {
	match value {
		1 => Rating::Again,
		2 => Rating::Hard,
		4 => Rating::Easy,
		_ => Rating::Good,
	}
}

/// What the reviews say about every card.
pub struct Schedule {
	cards: HashMap<String, Reviewed>,
}

impl Schedule {
	/// Replays `reviews`, whatever the order they were read in.
	#[must_use]
	pub fn replay(mut reviews: Vec<Review>) -> Self {
		reviews.sort_by(|left, right| {
			(left.at, &left.card, left.rating).cmp(&(
				right.at,
				&right.card,
				right.rating,
			))
		});
		let fsrs = FSRS::default();
		let mut cards: HashMap<String, Reviewed> = HashMap::new();
		for review in reviews {
			let at = time(review.at);
			let entry = cards.entry(review.card).or_insert_with(|| Reviewed {
				card: Card {
					due: at,
					last_review: at,
					..Card::default()
				},
				first: review.at,
			});
			entry.card = fsrs
				.next(entry.card.clone(), at, rating(review.rating))
				.card;
		}
		Self { cards }
	}

	/// Cards seen for the first time since `day_start`.
	fn new_since(&self, day_start: i64) -> usize {
		self.cards
			.values()
			.filter(|reviewed| reviewed.first >= day_start)
			.count()
	}

	/// The cards of `cards` to review at `clock.now`, in the order of
	/// Anki: those due, soonest first; then new ones, in note order, up to
	/// `clock.new_per_day` a day; then the cards still learning (scheduled
	/// less than a day ahead) that are not due yet, soonest first, as
	/// Anki's learn-ahead: a review never waits for a learning step and
	/// ends when every card is a day or more ahead. Identical questions
	/// share one key and show once.
	#[must_use]
	pub fn due(
		&self,
		cards: &[IndexedCard],
		clock: ReviewClock,
	) -> Vec<DueCard> {
		let mut seen = HashSet::new();
		let mut queues = Queues::default();
		for (card, direction) in directions(cards) {
			let key = card_key(&card.hash, direction);
			if seen.insert(key.clone()) {
				let reviewed =
					self.cards.get(&key).map(|reviewed| &reviewed.card);
				let entry =
					due_card(card, (key, direction), reviewed.is_none());
				queues.add((reviewed, entry), time(clock.now));
			}
		}
		let room = clock
			.new_per_day
			.saturating_sub(self.new_since(clock.day_start));
		queues.into_order(room)
	}
}

/// The cards of a review, by queue.
#[derive(Default)]
struct Queues {
	due: Vec<(DateTime<Utc>, DueCard)>,
	fresh: Vec<DueCard>,
	learning: Vec<(DateTime<Utc>, DueCard)>,
}

impl Queues {
	/// Puts `card` in its queue, from the state of its reviews.
	fn add(
		&mut self,
		(reviewed, card): (Option<&Card>, DueCard),
		now: DateTime<Utc>,
	) {
		match reviewed {
			None => self.fresh.push(card),
			Some(state) if state.due <= now => self.due.push((state.due, card)),
			Some(state)
				if state.due - state.last_review < TimeDelta::days(1) =>
			{
				self.learning.push((state.due, card));
			}
			Some(_) => {}
		}
	}

	/// Due cards, then `room` new ones, then learning ones ahead of time.
	fn into_order(mut self, room: usize) -> Vec<DueCard> {
		self.due.sort_by_key(|(at, _)| *at);
		self.learning.sort_by_key(|(at, _)| *at);
		self.due
			.into_iter()
			.map(|(_, card)| card)
			.chain(self.fresh.into_iter().take(room))
			.chain(self.learning.into_iter().map(|(_, card)| card))
			.collect()
	}
}

/// Each card in the directions it is reviewed in.
fn directions(
	cards: &[IndexedCard],
) -> impl Iterator<Item = (&IndexedCard, Direction)> {
	cards.iter().flat_map(|card| {
		let reverse = card.reverse.then_some((card, Direction::Reverse));
		std::iter::once((card, Direction::Forward)).chain(reverse)
	})
}

fn due_card(
	card: &IndexedCard,
	(key, direction): (String, Direction),
	is_new: bool,
) -> DueCard {
	DueCard {
		key,
		note: card.note.clone(),
		position: card.position,
		is_reverse: direction == Direction::Reverse,
		question: card.question.clone(),
		answer: card.answer.clone(),
		is_new,
	}
}
