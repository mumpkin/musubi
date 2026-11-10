// SPDX-License-Identifier: GPL-3.0-or-later
//! File names derived from note titles, as specified in
//! `docs/vault-format.md` ("Naming algorithm").

use unicode_normalization::UnicodeNormalization;

/// Characters forbidden on Windows or in paths.
const FORBIDDEN: [char; 9] = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];
const RESERVED: [&str; 4] = ["CON", "PRN", "AUX", "NUL"];
const RESERVED_NUMBERED: [&str; 2] = ["COM", "LPT"];
const MAX_STEM_BYTES: usize = 200;
const UNTITLED: &str = "Untitled";
const FIRST_SUFFIX: usize = 2;

/// Whitespace (tabs and line breaks included) becomes `_`; other control
/// characters are removed.
fn is_removed(character: char) -> bool {
	FORBIDDEN.contains(&character)
		|| (character.is_control() && !character.is_whitespace())
}

/// Steps 2 to 4: forbidden characters removed, whitespace runs and `_` runs
/// collapsed into a single `_`.
fn clean(title: &str) -> String {
	let mut cleaned = String::with_capacity(title.len());
	for character in title.nfc().filter(|character| !is_removed(*character)) {
		let underscore = character.is_whitespace() || character == '_';
		if underscore {
			if !cleaned.ends_with('_') {
				cleaned.push('_');
			}
		} else {
			cleaned.push(character);
		}
	}
	cleaned
}

fn trim_edges(stem: &str) -> &str {
	stem.trim_matches(|character| character == '_' || character == '.')
}

fn is_reserved(stem: &str) -> bool {
	let upper = stem.to_uppercase();
	if RESERVED.contains(&upper.as_str()) {
		return true;
	}
	RESERVED_NUMBERED.iter().any(|prefix| {
		upper.strip_prefix(prefix).is_some_and(|digit| {
			digit.len() == 1
				&& digit.chars().all(|number| ('1'..='9').contains(&number))
		})
	})
}

fn truncate(stem: &str) -> &str {
	if stem.len() <= MAX_STEM_BYTES {
		return stem;
	}
	let mut end = MAX_STEM_BYTES;
	while !stem.is_char_boundary(end) {
		end -= 1;
	}
	stem.get(..end)
		.map_or(stem, |head| head.trim_end_matches(['_', '.']))
}

/// The stem (name without extension) for `title`, before collisions
/// (steps 1 to 8).
#[must_use]
pub fn base_stem(title: &str) -> String {
	let cleaned = clean(title);
	let mut stem = trim_edges(&cleaned).to_owned();
	if stem.is_empty() {
		stem = UNTITLED.to_owned();
	}
	if is_reserved(&stem) {
		stem.push('_');
	}
	truncate(&stem).to_owned()
}

/// Comparison key: the vault may be synced to a case-insensitive file
/// system.
fn fold(name: &str) -> String {
	name.nfc().collect::<String>().to_lowercase()
}

/// Names already present in a folder, and the extensions a stem would take.
pub struct Folder<'names> {
	/// Names of the files and folders in the folder.
	pub existing: &'names [String],
	/// Name of the entry being renamed, which never collides with itself.
	pub own: Option<&'names str>,
}

impl Folder<'_> {
	fn is_taken(&self, stem: &str, extensions: &[&str]) -> bool {
		let own = self.own.map(fold);
		extensions.iter().any(|extension| {
			let candidate = fold(&format!("{stem}{extension}"));
			self.existing
				.iter()
				.map(|name| fold(name))
				.any(|name| name == candidate && Some(&name) != own.as_ref())
		})
	}

	/// Step 9: `base`, or `base_2`, `base_3`… until no name with one of
	/// `extensions` is taken.
	#[must_use]
	pub fn unique(&self, base: &str, extensions: &[&str]) -> String {
		let mut stem = base.to_owned();
		let mut suffix = FIRST_SUFFIX;
		while self.is_taken(&stem, extensions) {
			stem = format!("{base}_{suffix}");
			suffix += 1;
		}
		stem
	}
}

/// Extensions a note stem collides with: the note and its images folder.
pub const NOTE_EXTENSIONS: [&str; 2] = [".typ", ".assets"];

/// File name of a new note titled `title` in `folder`.
#[must_use]
pub fn note_file_name(title: &str, folder: &Folder<'_>) -> String {
	let stem = folder.unique(&base_stem(title), &NOTE_EXTENSIONS);
	format!("{stem}.typ")
}

#[cfg(test)]
mod tests {
	use super::{Folder, base_stem, note_file_name};

	fn name_in(title: &str, existing: &[&str]) -> String {
		let existing: Vec<String> =
			existing.iter().map(|name| (*name).to_owned()).collect();
		note_file_name(
			title,
			&Folder {
				existing: &existing,
				own: None,
			},
		)
	}

	#[test]
	fn follows_the_examples_of_the_vault_format() {
		let examples = [
			("Mes cours de maths", "Mes_cours_de_maths.typ"),
			("  Mes   cours  ", "Mes_cours.typ"),
			("La poétique d'Aristote", "La_poétique_d'Aristote.typ"),
			("Cafe\u{301}", "Café.typ"),
			("Café ou thé ?", "Café_ou_thé.typ"),
			("C++ : les pointeurs", "C++_les_pointeurs.typ"),
			("2026/11/10 Réunion", "20261110_Réunion.typ"),
			("\"Citation\"", "Citation.typ"),
			("snake_case _ note", "snake_case_note.typ"),
			("Ligne 1\tLigne 2", "Ligne_1_Ligne_2.typ"),
			(".config", "config.typ"),
			("Fin.", "Fin.typ"),
			("...", "Untitled.typ"),
			("???", "Untitled.typ"),
			("Nul", "Nul_.typ"),
			("com1", "com1_.typ"),
			("🎉 Fête", "🎉_Fête.typ"),
		];
		for (title, expected) in examples {
			assert_eq!(name_in(title, &[]), expected, "title {title:?}");
		}
	}

	#[test]
	fn adds_a_suffix_on_collisions_ignoring_case() {
		let title = "Mes cours de maths";
		let expected = "Mes_cours_de_maths_2.typ";
		assert_eq!(name_in(title, &["Mes_cours_de_maths.typ"]), expected);
		assert_eq!(name_in(title, &["mes_cours_de_maths.typ"]), expected);
		assert_eq!(name_in(title, &["Mes_cours_de_maths.assets"]), expected);
		assert_eq!(
			name_in("Exercice 2", &["Exercice_2.typ"]),
			"Exercice_2_2.typ"
		);
		assert_eq!(
			name_in("Untitled", &["Untitled.typ", "Untitled_2.typ"]),
			"Untitled_3.typ"
		);
	}

	#[test]
	fn never_collides_with_itself() {
		let existing = vec!["Notes.typ".to_owned()];
		let folder = Folder {
			existing: &existing,
			own: Some("Notes.typ"),
		};
		assert_eq!(note_file_name("Notes", &folder), "Notes.typ");
	}

	#[test]
	fn truncates_long_titles_at_200_bytes() {
		assert_eq!(base_stem(&"a".repeat(300)), "a".repeat(200));
		let accents = "é".repeat(150);
		assert_eq!(base_stem(&accents), "é".repeat(100));
	}
}
