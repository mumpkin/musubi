// SPDX-License-Identifier: GPL-3.0-or-later
//! Core of Musubi: vault, file naming, links, backlinks and index.

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
