# Prototype: Typst to HTML in Rust

Issue #6. Question: can the Rust core compile a note to HTML with the official
Typst crates, fast enough for the reading view, and read its links and cards?

**Answer: yes.** The prototype is the base of the real implementation, not a
throwaway.

## What was built

- `crates/musubi-typst`:
    - `VaultWorld`, the Typst `World` of a vault. It uses `typst-kit` for the
      file cache (`FileStore`), the embedded fonts and the date.
    - `VaultFiles` loads files from the vault (paths cannot escape it) and
      serves the `musubi` package from the binary (`@local/musubi:*`).
    - `NoteCompiler::render(path)` returns the HTML, the diagnostics (with line
      and column in the note) and the index: links, cards and tasks read from the
      package metadata.
    - Integration tests on `examples/demo-vault`, and `examples/timing.rs`.
- Desktop app: `render_note` Tauri command (run outside the main thread) and a
  `ReadingView` Svelte component; the demo page switches between the notes of
  the demo vault and follows note links.

## Timings

`cargo run --release --example timing -p musubi-typst`, on the author's
laptop:

| Step                                         | Release | Debug   |
| -------------------------------------------- | ------- | ------- |
| Create the compiler (library, font metadata) | 1.8 ms  | 15 ms   |
| First compilation of the demo note           | 18 ms   | 190 ms  |
| Compilation of an unchanged note             | 0.03 ms | 0.43 ms |
| First compilation of another note            | 0.2 ms  | 2.7 ms  |
| Compilation after an edit (save)             | 0.6 ms  | 5.8 ms  |

The first compilation pays for loading fonts and warming Typst's caches. After
that, rendering on save is far below what a user can notice, as long as the
`NoteCompiler` is kept alive between compilations.

## Findings

1. **Math is exported as MathML** by Typst 0.15. No `html.frame` SVG islands
   are needed for equations; the webview renders them natively. Fonts: the
   math font of the system is used, which differs slightly from the PDF.
2. **`target()` works** in the official crates: the package tells HTML from
   PDF without the `sys.inputs` workaround needed with typst.ts.
3. **Metadata queries** give links, cards and tasks without writing a parser.
   Card questions are converted to plain text with `Content::plain_text`.
4. **The HTML export is still experimental**: Typst warns on every
   compilation. The warning is hidden, since Musubi pins its Typst version
   and tests the output. Upgrading Typst needs a check of the reading view.
5. **Security**: a note can emit any element with `html.elem`, including
   `<script>`. The interface removes scripts, embedded documents, event
   handlers and `javascript:` URLs before display (`note-html.ts`), and the
   window's content security policy blocks inline scripts. A sanitizer in Rust,
   working on the HTML tree before encoding, would be more robust: to do when
   the reading view is built for real.
6. **Packages other than `musubi`** are refused for now. Supporting Typst
   Universe would need downloads; a local package folder is simpler. To decide
   when a need appears.
7. Headings `=` become `<h2>`: Typst keeps `<h1>` for the document title.
   Only a matter of CSS.
8. Code blocks are highlighted with inline colors meant for a light
   background; theme colors are the subject of issue #9.

## Next steps

- Source positions of rendered blocks (issue #7).
- Theme colors in the rendering (issue #9).
- Update the architecture decisions with these results.
