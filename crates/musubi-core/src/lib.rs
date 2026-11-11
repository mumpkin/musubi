// SPDX-License-Identifier: GPL-3.0-or-later
//! Core of Musubi: vault, file naming, links, backlinks and index.

mod assets;
mod context;
mod error;
mod index;
pub mod links;
pub mod naming;
mod passages;
mod paths;
mod rename;
mod search;
pub mod title;
mod vault;

pub use crate::assets::{NewAsset, is_image};
pub use crate::error::VaultError;
pub use crate::index::{Backlink, TextMatch, VaultIndex};
pub use crate::rename::save_note;
pub use crate::search::{NoteMatch, search_headings, search_titles};
pub use crate::vault::{FORMAT, NoteEntry, Vault, VaultTree};

/// Version of the core crate, as declared in `Cargo.toml`.
#[must_use]
pub const fn version() -> &'static str {
	env!("CARGO_PKG_VERSION")
}

#[cfg(test)]
mod tests {
	use super::version;

	#[test]
	fn version_matches_the_manifest() {
		assert_eq!(version(), env!("CARGO_PKG_VERSION"));
	}
}
