// SPDX-License-Identifier: GPL-3.0-or-later
//! Loads the files a note needs: other files of the vault, and the embedded
//! `musubi` package.

use std::path::PathBuf;

use typst::diag::{FileError, FileResult, PackageError};
use typst::foundations::Bytes;
use typst::syntax::{FileId, VirtualRoot};
use typst_kit::files::{FileLoader, FsRoot};

use crate::package;

/// File loader for one vault. Paths cannot escape the vault root.
pub struct VaultFiles {
	vault: FsRoot,
}

impl VaultFiles {
	pub fn new(vault_root: PathBuf) -> Self {
		Self {
			vault: FsRoot::new(vault_root),
		}
	}
}

impl FileLoader for VaultFiles {
	fn load(&self, id: FileId) -> FileResult<Bytes> {
		match id.root() {
			VirtualRoot::Project => self.vault.load(id.vpath()),
			VirtualRoot::Package(spec) if package::is_musubi(spec) => {
				package::file(id.vpath().get_with_slash())
					.map(Bytes::from_string)
					.ok_or_else(|| {
						FileError::NotFound(id.vpath().get_with_slash().into())
					})
			}
			// Other packages are not supported yet: they would need a
			// download from Typst Universe or a local package folder.
			VirtualRoot::Package(spec) => {
				Err(FileError::Package(PackageError::NotFound(spec.clone())))
			}
		}
	}
}
