// SPDX-License-Identifier: GPL-3.0-or-later
//! Paths inside a vault. Paths come from the interface, relative to the
//! vault root with `/` separators; none may lead outside the vault.

use std::path::{Component, Path, PathBuf};

use crate::error::VaultError;

/// `relative`, checked: no root, no `..`, no empty part.
fn checked_parts(relative: &str) -> Result<PathBuf, VaultError> {
	let path = Path::new(relative);
	let mut parts = PathBuf::new();
	for component in path.components() {
		match component {
			Component::Normal(part) => parts.push(part),
			Component::CurDir => {}
			_ => return Err(VaultError::OutsideVault(relative.to_owned())),
		}
	}
	Ok(parts)
}

/// Absolute path of `relative` in the vault at `root` (canonical). Existing
/// paths are resolved through symbolic links and must stay in the vault.
///
/// # Errors
///
/// [`VaultError::OutsideVault`] if the path leaves the vault.
pub fn resolve(root: &Path, relative: &str) -> Result<PathBuf, VaultError> {
	let path = root.join(checked_parts(relative)?);
	let Ok(real) = path.canonicalize() else {
		return Ok(path);
	};
	if real.starts_with(root) {
		Ok(real)
	} else {
		Err(VaultError::OutsideVault(relative.to_owned()))
	}
}

/// `path` relative to `root`, with `/` separators.
#[must_use]
pub fn relative(root: &Path, path: &Path) -> String {
	let inner = path.strip_prefix(root).unwrap_or(path);
	inner
		.components()
		.map(|component| component.as_os_str().to_string_lossy())
		.collect::<Vec<_>>()
		.join("/")
}

#[cfg(test)]
mod tests {
	use std::path::Path;

	use super::resolve;

	#[test]
	fn keeps_paths_inside_the_vault() {
		let root = Path::new("/vault");
		let resolved = resolve(root, "Maths/Analyse.typ");
		assert_eq!(resolved.ok(), Some(root.join("Maths/Analyse.typ")));
	}

	#[test]
	fn refuses_paths_that_leave_the_vault() {
		let root = Path::new("/vault");
		for path in ["../secret.typ", "/etc/passwd", "Maths/../../x.typ"] {
			assert!(resolve(root, path).is_err(), "{path}");
		}
	}
}
