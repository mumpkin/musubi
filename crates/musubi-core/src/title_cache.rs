// SPDX-License-Identifier: GPL-3.0-or-later
//! Titles of the notes, kept between listings of the vault: a title is
//! read again only when its file changed (time or size). Listing a large
//! vault then reads the metadata of its files, not their text.

use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, PoisonError};
use std::time::SystemTime;

/// What tells that a file changed since its title was read.
#[derive(Clone, Copy, PartialEq, Eq)]
struct Stamp {
	modified: Option<SystemTime>,
	size: u64,
}

fn stamp(file: &Path) -> Option<Stamp> {
	let metadata = fs::metadata(file).ok()?;
	Some(Stamp {
		modified: metadata.modified().ok(),
		size: metadata.len(),
	})
}

type Titles = HashMap<PathBuf, (Stamp, String)>;

#[derive(Default)]
pub struct TitleCache {
	titles: Mutex<Titles>,
}

/// One listing of the vault: the titles known before it, and the ones it
/// finds, which replace them once it is done; deleted notes drop out.
pub struct Listing<'cache> {
	cache: &'cache TitleCache,
	before: Titles,
	found: Titles,
}

impl TitleCache {
	pub fn listing(&self) -> Listing<'_> {
		let mut titles =
			self.titles.lock().unwrap_or_else(PoisonError::into_inner);
		Listing {
			cache: self,
			before: std::mem::take(&mut *titles),
			found: Titles::new(),
		}
	}
}

impl Listing<'_> {
	/// The title of the note at `file`, read with `read` when it changed.
	pub fn title(
		&mut self,
		file: &Path,
		read: impl FnOnce() -> String,
	) -> String {
		let current = stamp(file);
		let known = self
			.before
			.remove(file)
			.filter(|(was, _)| Some(*was) == current);
		let title = known.map_or_else(read, |(_, title)| title);
		if let Some(current) = current {
			self.found
				.insert(file.to_path_buf(), (current, title.clone()));
		}
		title
	}
}

impl Drop for Listing<'_> {
	fn drop(&mut self) {
		let mut titles = self
			.cache
			.titles
			.lock()
			.unwrap_or_else(PoisonError::into_inner);
		*titles = std::mem::take(&mut self.found);
	}
}

#[cfg(test)]
mod tests {
	use std::fs;

	use super::TitleCache;

	#[test]
	fn reads_a_title_again_only_when_the_file_changes() {
		let folder = tempfile::tempdir().expect("folder");
		let file = folder.path().join("A.typ");
		fs::write(&file, "= A").expect("write");
		let cache = TitleCache::default();
		let mut reads = 0;
		for _ in 0..2 {
			let mut listing = cache.listing();
			listing.title(&file, || {
				reads += 1;
				"A".to_owned()
			});
		}
		assert_eq!(reads, 1);
		fs::write(&file, "= Longer").expect("write");
		let title = cache.listing().title(&file, || "Longer".to_owned());
		assert_eq!(title, "Longer");
	}

	#[test]
	fn forgets_the_notes_a_listing_did_not_find() {
		let folder = tempfile::tempdir().expect("folder");
		let file = folder.path().join("A.typ");
		fs::write(&file, "= A").expect("write");
		let cache = TitleCache::default();
		cache.listing().title(&file, || "A".to_owned());
		drop(cache.listing());
		let mut read = false;
		cache.listing().title(&file, || {
			read = true;
			"A".to_owned()
		});
		assert!(read);
	}
}
