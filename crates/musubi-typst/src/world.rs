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

use crate::files::VaultFiles;

/// Compilation context of a vault. It is kept between compilations so that
/// Typst reuses its caches (incremental compilation).
pub struct VaultWorld {
	library: LazyHash<Library>,
	fonts: FontStore,
	files: FileStore<VaultFiles>,
	main: FileId,
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
		Self {
			library: LazyHash::new(library),
			fonts: font_store,
			files: FileStore::new(VaultFiles::new(vault_root)),
			main: note_id(&VirtualPath::new("/main.typ").unwrap_or_else(
				|_| unreachable!("`/main.typ` is a valid virtual path"),
			)),
			time: Time::system(),
		}
	}

	/// Selects the note to compile and marks the files as stale, so that the
	/// next compilation reads changed files again.
	pub fn prepare(&mut self, note: &VirtualPath) {
		self.main = note_id(note);
		self.files.reset();
		self.time.reset();
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
		self.main
	}

	fn source(&self, id: FileId) -> FileResult<Source> {
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
