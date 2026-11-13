// SPDX-License-Identifier: GPL-3.0-or-later
//! Flashcard reviews: the log of each device, the schedule replayed from
//! all of them, new cards a day, and keys that survive a rename.

use std::fs;

use musubi_core::cards::{Review, Schedule};
use musubi_core::{DueRequest, ReviewClock, Vault, VaultIndex};
use musubi_typst::NoteCompiler;
use tempfile::TempDir;

const IMPORT: &str = "#import \"@local/musubi:0.1.0\": card\n";
const DAY: i64 = 86_400;
const START: i64 = 1_800_000_000;

struct Setup {
	_directory: TempDir,
	vault: Vault,
	compiler: NoteCompiler,
	index: VaultIndex,
}

impl Setup {
	fn new(files: &[(&str, &str)]) -> Self {
		let directory = TempDir::new().expect("temporary directory");
		for (path, content) in files {
			let file = directory.path().join(path);
			if let Some(parent) = file.parent() {
				fs::create_dir_all(parent).expect("folder");
			}
			fs::write(file, format!("{IMPORT}{content}")).expect("note");
		}
		let vault = Vault::open(directory.path()).expect("vault opens");
		let compiler = NoteCompiler::new(vault.root().to_path_buf());
		let mut setup = Self {
			_directory: directory,
			vault,
			compiler,
			index: VaultIndex::in_memory().expect("index"),
		};
		setup.refresh();
		setup
	}

	fn refresh(&mut self) {
		self.index
			.refresh(&self.vault, &mut self.compiler)
			.expect("index refreshes");
	}

	fn due(&self, scope: &str, now: i64) -> Vec<(String, bool)> {
		let clock = ReviewClock {
			now,
			day_start: now - now % DAY,
			new_per_day: 20,
		};
		self.vault
			.due_cards(&self.index, DueRequest { scope, clock })
			.expect("due cards")
			.into_iter()
			.map(|card| (card.question, card.is_reverse))
			.collect()
	}

	fn review(&self, (device, card): (&str, &str), at: i64) {
		let review = Review {
			card: card.to_owned(),
			at,
			rating: 3,
		};
		self.vault.record_review(device, &review).expect("recorded");
	}

	fn key_of(&self, question: &str) -> String {
		let clock = ReviewClock {
			now: START,
			day_start: START,
			new_per_day: 100,
		};
		self.vault
			.due_cards(&self.index, DueRequest { scope: "", clock })
			.expect("due cards")
			.into_iter()
			.find(|card| card.question == question && !card.is_reverse)
			.expect("card")
			.key
	}
}

#[test]
fn lists_new_cards_in_both_directions_by_scope() {
	let setup = Setup::new(&[
		("Words.typ", "#card(reverse: true)[chat][cat]\n"),
		("Maths/Squares.typ", "#card[$2^2$][4]\n"),
	]);
	assert_eq!(
		setup.due("", START),
		[
			("22".to_owned(), false),
			("chat".to_owned(), false),
			("chat".to_owned(), true),
		]
	);
	assert_eq!(setup.due("Maths", START), [("22".to_owned(), false)]);
	assert_eq!(setup.due("Words.typ", START).len(), 2);
}

#[test]
fn schedules_a_reviewed_card_later() {
	let setup = Setup::new(&[("Words.typ", "#card[chat][cat]\n")]);
	let key = setup.key_of("chat");
	setup.review(("aaaa", &key), START);
	setup.review(("aaaa", &key), START + 600);
	assert!(setup.due("", START + 700).is_empty());
	assert_eq!(setup.due("", START + 30 * DAY).len(), 1);
}

/// Three reviews of one card, in the order of `order`.
fn reviews_in(order: &[usize]) -> Vec<Review> {
	let all = [(START, 3), (START + DAY, 1), (START + 2 * DAY, 4)];
	order
		.iter()
		.map(|index| Review {
			card: "k:forward".into(),
			at: all[*index].0,
			rating: all[*index].1,
		})
		.collect()
}

#[test]
fn gives_the_same_schedule_whatever_the_device_files() {
	let card = musubi_core::IndexedCard {
		note: "A.typ".into(),
		position: 0,
		hash: "k".into(),
		question: "q".into(),
		answer: "a".into(),
		reverse: false,
	};
	for now in [START + 3 * DAY, START + 40 * DAY] {
		let clock = ReviewClock {
			now,
			day_start: now,
			new_per_day: 0,
		};
		let cards = std::slice::from_ref(&card);
		assert_eq!(
			Schedule::replay(reviews_in(&[0, 1, 2])).due(cards, clock),
			Schedule::replay(reviews_in(&[2, 0, 1])).due(cards, clock)
		);
	}
}

#[test]
fn limits_the_new_cards_of_a_day() {
	let questions: String = (0..25)
		.map(|number| format!("#card[q{number}][a]\n"))
		.collect();
	let setup = Setup::new(&[("Many.typ", &questions)]);
	assert_eq!(setup.due("", START).len(), 20);
	let key = setup.key_of("q0");
	setup.review(("bbbb", &key), START + 10);
	// 19 new cards left today, then q0, still learning.
	let due = setup.due("", START + 20);
	assert_eq!(due.len(), 20);
	assert_eq!(due.last(), Some(&("q0".to_owned(), false)));
}

#[test]
fn keeps_the_history_when_a_note_moves() {
	let mut setup = Setup::new(&[("Words.typ", "#card[chat][cat]\n")]);
	let key = setup.key_of("chat");
	setup.review(("cccc", &key), START);
	setup.review(("cccc", &key), START + 10);
	setup
		.vault
		.move_entry("Words.typ", "Archive/Words.typ")
		.expect("moved");
	setup.refresh();
	// Learnt: not due at once, due a month later, with the same key.
	assert!(setup.due("", START + 60).is_empty());
	assert_eq!(
		setup.due("", START + 30 * DAY),
		[("chat".to_owned(), false)]
	);
}

#[test]
fn skips_unreadable_log_lines() {
	let setup = Setup::new(&[("Words.typ", "#card[chat][cat]\n")]);
	setup.review(("dddd", "k:forward"), START);
	let log = setup.vault.root().join(".musubi/reviews/dddd.jsonl");
	let text = fs::read_to_string(&log).expect("log");
	fs::write(&log, format!("{text}{{\"card\": \"half")).expect("log");
	assert_eq!(setup.vault.reviews().expect("reviews").len(), 1);
}

#[test]
fn keeps_learning_cards_in_the_review_as_anki() {
	let setup =
		Setup::new(&[("Words.typ", "#card[chat][cat]\n#card[chien][dog]\n")]);
	let chat = setup.key_of("chat");
	// Again: due in a minute, shown at once after the other card.
	setup
		.vault
		.record_review(
			"eeee",
			&Review {
				card: chat.clone(),
				at: START,
				rating: 1,
			},
		)
		.expect("recorded");
	assert_eq!(
		setup.due("", START + 5),
		[("chien".to_owned(), false), ("chat".to_owned(), false)]
	);
	// Good twice: a day or more ahead, the review is over for it.
	setup.review(("eeee", &chat), START + 10);
	setup.review(("eeee", &chat), START + 20);
	assert_eq!(setup.due("", START + 30), [("chien".to_owned(), false)]);
}

#[test]
fn starts_the_day_of_reviews_at_four() {
	let now = musubi_core::trash::now();
	let start = musubi_core::cards::local_day_start(now);
	assert!(start <= now && now - start < DAY);
}
