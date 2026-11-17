// SPDX-License-Identifier: GPL-3.0-or-later
//! A reproducible vault of `notes` notes: nested folders, paragraphs, a few
//! headings, formulas, flashcards and links. As in a real vault, most links
//! stay within a folder, and some notes are linked far more than others.

use std::fmt::Write as _;
use std::fs;
use std::io;
use std::path::Path;

const NOTES_PER_FOLDER: usize = 40;
// Out of `LINK_DRAWS`, links that go to a note of the same folder.
const LOCAL_LINKS: usize = 7;
const LINK_DRAWS: usize = 10;
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

/// The notes: their path from the vault root, without extension, and the
/// notes of each folder, by number.
struct Notes {
	paths: Vec<String>,
	folder_of: Vec<usize>,
	in_folder: Vec<Vec<usize>>,
}

impl Notes {
	fn new(notes: usize, random: &mut Random) -> Self {
		let folders = folders(notes.div_ceil(NOTES_PER_FOLDER), random);
		let mut in_folder = vec![Vec::new(); folders.len()];
		let mut paths = Vec::with_capacity(notes);
		let mut folder_of = Vec::with_capacity(notes);
		for number in 0..notes {
			let folder = random.below(folders.len());
			in_folder[folder].push(number);
			folder_of.push(folder);
			paths.push(format!("{}/Note_{number}", folders[folder]));
		}
		Self {
			paths,
			folder_of,
			in_folder,
		}
	}

	/// The target of a link from note `number`: mostly a note of its
	/// folder, otherwise one of the most linked notes of the vault.
	fn link_from(&self, number: usize, random: &mut Random) -> &str {
		let near = &self.in_folder[self.folder_of[number]];
		let target = if random.below(LINK_DRAWS) < LOCAL_LINKS {
			near[random.below(near.len())]
		} else {
			random.skewed(self.paths.len())
		};
		&self.paths[target]
	}
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

fn note(number: usize, notes: &Notes, random: &mut Random) -> String {
	let mut source =
		String::from("#import \"@local/musubi:0.1.0\": card, note-link\n\n");
	let _ = writeln!(source, "= Note {number} {}\n", random.word());
	let links: Vec<String> = (0..random.below(6))
		.map(|_| notes.link_from(number, random).to_owned())
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
	let notes = Notes::new(notes, &mut random);
	for (number, path) in notes.paths.iter().enumerate() {
		let file = root.join(format!("{path}.typ"));
		if let Some(folder) = file.parent() {
			fs::create_dir_all(folder)?;
		}
		fs::write(file, note(number, &notes, &mut random))?;
	}
	Ok(notes
		.paths
		.iter()
		.map(|path| format!("{path}.typ"))
		.collect())
}
