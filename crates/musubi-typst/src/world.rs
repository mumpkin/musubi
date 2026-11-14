// SPDX-License-Identifier: GPL-3.0-or-later
//! The Typst `World` of a vault: everything the compiler can see.

use std::path::PathBuf;

use typst::diag::FileResult;
use typst::foundations::{Bytes, Datetime, Duration};
use typst::syntax::{FileId, RootedPath, Source, VirtualPath, VirtualRoot};
use typst::text::{Font, FontBook};
use typst::utils::LazyHash;
use typst::{Feature, Features, Library, LibraryExt, World};
use typst_kit::datetime::Time;
use typst_kit::files::FileStore;
use typst_kit::fonts::{self, FontStore};

use crate::entry;
use crate::fallback::PatchedNote;
use crate::files::VaultFiles;

/// Compilation context of a vault. It is kept between compilations so that
/// Typst reuses its caches (incremental compilation).
pub struct VaultWorld {
	library: LazyHash<Library>,
	fonts: FontStore,
	files: FileStore<VaultFiles>,
	/// The note being compiled.
	note: FileId,
	/// The entry point of the compilation, which includes the note
	/// (`entry.rs`).
	entry: Source,
	/// The note with elements replaced by notices, and its text.
	patched: Option<(PatchedNote, Source)>,
	time: Time,
}

impl VaultWorld {
	/// Creates the world of the vault at `vault_root`, with the fonts
	/// embedded in Typst. The HTML export is enabled.
	pub fn new(vault_root: PathBuf) -> Self {
		let library = Library::builder()
			.with_features(Features::from_iter([Feature::Html]))
			.build();
		let mut font_store = FontStore::new();
		font_store.extend(fonts::embedded());
		let note = note_id(&entry::entry_path());
		Self {
			library: LazyHash::new(library),
			fonts: font_store,
			files: FileStore::new(VaultFiles::new(vault_root)),
			note,
			entry: entry::entry_source(note, ""),
			patched: None,
			time: Time::system(),
		}
	}

	/// Selects the note to compile and marks the files as stale, so that the
	/// next compilation reads changed files again.
	pub fn prepare(&mut self, note: &VirtualPath) {
		self.note = note_id(note);
		self.entry = entry::entry_source(
			note_id(&entry::entry_path()),
			note.get_with_slash(),
		);
		self.patched = None;
		self.files.reset();
		self.time.reset();
	}

	/// The note as it is on disk, even when the compilation uses a patched
	/// copy.
	pub fn original_note(&self) -> FileResult<Source> {
		self.files.source(self.note)
	}

	/// Compiles `note` instead of the note on disk from now on.
	pub fn patch_note(&mut self, note: PatchedNote) {
		let text = Source::new(self.note, note.text());
		self.patched = Some((note, text));
	}

	/// The patched note, which the compilation no longer uses until it is
	/// given back with `patch_note`.
	pub fn take_patched_note(&mut self) -> Option<PatchedNote> {
		self.patched.take().map(|(note, _)| note)
	}

	pub fn patched_note(&self) -> Option<&PatchedNote> {
		self.patched.as_ref().map(|(note, _)| note)
	}

	/// The byte of the note on disk that `byte` of the compiled note comes
	/// from.
	pub fn to_original(&self, byte: usize) -> usize {
		self.patched_note()
			.map_or(byte, |note| note.to_original(byte))
	}

	/// The note being compiled; the main file of the compilation is the
	/// entry point that includes it.
	pub const fn note(&self) -> FileId {
		self.note
	}
}

fn note_id(path: &VirtualPath) -> FileId {
	RootedPath::new(VirtualRoot::Project, path.clone()).intern()
}

impl World for VaultWorld {
	fn library(&self) -> &LazyHash<Library> {
		&self.library
	}

	fn book(&self) -> &LazyHash<FontBook> {
		self.fonts.book()
	}

	fn main(&self) -> FileId {
		self.entry.id()
	}

	fn source(&self, id: FileId) -> FileResult<Source> {
		if id == self.entry.id() {
			return Ok(self.entry.clone());
		}
		if id == self.note
			&& let Some((_, text)) = &self.patched
		{
			return Ok(text.clone());
		}
		self.files.source(id)
	}

	fn file(&self, id: FileId) -> FileResult<Bytes> {
		self.files.file(id)
	}

	fn font(&self, index: usize) -> Option<Font> {
		self.fonts.font(index)
	}

	fn today(&self, offset: Option<Duration>) -> Option<Datetime> {
		self.time.today(offset)
	}
}
