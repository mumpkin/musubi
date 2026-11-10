// SPDX-License-Identifier: GPL-3.0-or-later
//! The `musubi` Typst package, embedded in the binary so that notes compile
//! without installing it.

use typst::syntax::package::PackageSpec;

/// Namespace and name under which notes import the package:
/// `#import "@local/musubi:0.1.0": *`.
const NAMESPACE: &str = "local";
const NAME: &str = "musubi";

/// Files of the package, by path from the package root.
const FILES: [(&str, &str); 6] = [
	(
		"/typst.toml",
		include_str!("../../../typst/musubi/typst.toml"),
	),
	("/lib.typ", include_str!("../../../typst/musubi/lib.typ")),
	(
		"/src/html.typ",
		include_str!("../../../typst/musubi/src/html.typ"),
	),
	(
		"/src/link.typ",
		include_str!("../../../typst/musubi/src/link.typ"),
	),
	(
		"/src/card.typ",
		include_str!("../../../typst/musubi/src/card.typ"),
	),
	(
		"/src/task.typ",
		include_str!("../../../typst/musubi/src/task.typ"),
	),
];

/// Whether `spec` designates the embedded package, in any version: there is
/// only one version in a given build of Musubi.
pub fn is_musubi(spec: &PackageSpec) -> bool {
	spec.namespace == NAMESPACE && spec.name == NAME
}

/// Content of a package file, if it exists.
pub fn file(path: &str) -> Option<&'static str> {
	FILES
		.iter()
		.find(|(file_path, _)| *file_path == path)
		.map(|(_, content)| *content)
}

#[cfg(test)]
mod tests {
	use super::file;

	#[test]
	fn embeds_the_entrypoint() {
		assert!(file("/lib.typ").is_some_and(|lib| lib.contains("note-link")));
	}

	#[test]
	fn knows_no_other_file() {
		assert!(file("/missing.typ").is_none());
	}
}
