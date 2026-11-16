// SPDX-License-Identifier: GPL-3.0-or-later
//! A reproducible vault of `notes` notes: nested folders, paragraphs, a few
//! headings, formulas, flashcards and links. Some notes are linked far more
//! than others, as in a real vault.

use std::fmt::Write as _;
use std::fs;
use std::io;
use std::path::Path;

const NOTES_PER_FOLDER: usize = 40;
const MAX_DEPTH: usize = 3;
const WORDS: [&str; 24] = [
	"lorem",
	"ipsum",
	"dolor",
	"sit",
	"amet",
	"consectetur",
	"adipiscing",
	"elit",
	"sed",
	"tempor",
	"magna",
	"aliqua",
	"veniam",
	"nostrud",
	"ullamco",
	"laboris",
	"commodo",
	"irure",
	"velit",
	"esse",
	"fugiat",
	"nulla",
	"pariatur",
	"officia",
];

/// A small deterministic generator (xorshift), so that every run builds the
/// same vault.
pub struct Random(u64);

impl Random {
	pub const fn new(seed: u64) -> Self {
		Self(seed)
	}

	pub const fn next(&mut self) -> u64 {
		self.0 ^= self.0 << 13;
		self.0 ^= self.0 >> 7;
		self.0 ^= self.0 << 17;
		self.0
	}

	/// A number in `0..bound`.
	pub fn below(&mut self, bound: usize) -> usize {
		usize::try_from(self.next() % bound.max(1) as u64).unwrap_or(0)
	}

	/// A number in `0..bound`, small ones much more often: the most linked
	/// notes come first.
	fn skewed(&mut self, bound: usize) -> usize {
		let first = self.below(bound);
		self.below(first + 1)
	}

	fn word(&mut self) -> &'static str {
		WORDS[self.below(WORDS.len())]
	}
}

fn folders(count: usize, random: &mut Random) -> Vec<String> {
	let mut folders: Vec<(String, usize)> = Vec::with_capacity(count);
	for number in 0..count {
		let parent = random.below(folders.len() + 1);
		let folder = match folders.get(parent) {
			Some((path, depth)) if *depth < MAX_DEPTH => {
				(format!("{path}/Topic {number}"), depth + 1)
			}
			_ => (format!("Area {number}"), 1),
		};
		folders.push(folder);
	}
	folders.into_iter().map(|(path, _)| path).collect()
}

/// Path of each note from the vault root, without extension.
fn note_paths(notes: usize, random: &mut Random) -> Vec<String> {
	let folders = folders(notes.div_ceil(NOTES_PER_FOLDER), random);
	(0..notes)
		.map(|number| {
			let folder = &folders[random.below(folders.len())];
			format!("{folder}/Note_{number}")
		})
		.collect()
}

fn paragraph(random: &mut Random, links: &[String]) -> String {
	let mut text = String::new();
	for _ in 0..random.below(60) + 20 {
		text.push_str(random.word());
		text.push(' ');
	}
	if let Some(target) = links.first() {
		let _ =
			write!(text, "see #note-link(\"{target}\")[{}]. ", random.word());
	}
	if random.below(4) == 0 {
		text.push_str("With $sum_(k=1)^n k = n(n+1)/2$ in the text.");
	}
	text
}

fn note(number: usize, paths: &[String], random: &mut Random) -> String {
	let mut source =
		String::from("#import \"@local/musubi:0.1.0\": card, note-link\n\n");
	let _ = writeln!(source, "= Note {number} {}\n", random.word());
	let links: Vec<String> = (0..random.below(6))
		.map(|_| paths[random.skewed(paths.len())].clone())
		.collect();
	for (section, chunk) in links.chunks(2).enumerate() {
		let _ = writeln!(source, "== Part {section}\n");
		let _ = writeln!(source, "{}\n", paragraph(random, chunk));
	}
	let _ = writeln!(source, "{}\n", paragraph(random, &[]));
	if random.below(5) == 0 {
		let _ = writeln!(
			source,
			"#card[What is {}?][{}]",
			random.word(),
			random.word()
		);
	}
	source
}

/// Writes the vault into `root`, which must be empty or missing. Returns
/// the paths of the notes, from the root and with extension.
pub fn vault(root: &Path, notes: usize, seed: u64) -> io::Result<Vec<String>> {
	let mut random = Random::new(seed);
	let paths = note_paths(notes, &mut random);
	for (number, path) in paths.iter().enumerate() {
		let file = root.join(format!("{path}.typ"));
		if let Some(folder) = file.parent() {
			fs::create_dir_all(folder)?;
		}
		fs::write(file, note(number, &paths, &mut random))?;
	}
	Ok(paths
		.into_iter()
		.map(|path| format!("{path}.typ"))
		.collect())
}
