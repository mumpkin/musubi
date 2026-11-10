// SPDX-License-Identifier: GPL-3.0-or-later
// Helpers shared by the functions: the reading view of Musubi is built from
// the HTML export, every other output is paged (PDF, PNG, SVG).

// Shows `html-output` when exporting to HTML and `paged-output` otherwise.
// `target()` needs a context, hence the wrapper.
#let by-target(html-output, paged-output) = context {
  if target() == "html" { html-output() } else { paged-output() }
}

// CSS classes of the reading view all start with this prefix, so that they
// never clash with the classes of the Typst HTML export.
#let css-class(name) = "musubi-" + name
