# Musubi

Local-first notes written in [Typst](https://typst.app), read in a native view
and edited the [Helix](https://helix-editor.com) way.

> Early development: nothing usable yet.

## What Musubi is

- **Notes are Typst files** in a plain folder you own. No database, no lock-in:
  every note still compiles with `typst compile`.
- **A native reading view**, not a PDF viewer: formatted text, links,
  equations, in the app's own theme.
- **Helix-style modal editing** of the whole source file, keyboard first but
  fully usable with the mouse.
- **Links, backlinks and a graph** between notes, plus flashcards.
- **Bring your own sync**: Syncthing, Nextcloud, git… Musubi only handles the
  conflict files they leave behind.
- Linux first, Android later.

## Development

Requirements: Node.js 24 or later, pnpm (version pinned in `package.json`),
Rust stable, and the
[Tauri system dependencies](https://v2.tauri.app/start/prerequisites/).

```sh
pnpm install          # also installs the git hooks (lefthook)
pnpm dev:tauri        # desktop app
```

| Command                                                 | Purpose                                                    |
| ------------------------------------------------------- | ---------------------------------------------------------- |
| `pnpm dev`                                              | Interface only, in a browser                               |
| `pnpm dev:tauri`                                        | Desktop app                                                |
| `pnpm check`                                            | Lint and format check (ESLint, Prettier), Rust file length |
| `pnpm fix`                                              | Apply the automatic fixes and formatting                   |
| `pnpm typecheck`                                        | Type checking (TypeScript, Svelte)                         |
| `pnpm test`                                             | Unit tests (Vitest)                                        |
| `pnpm test:coverage`                                    | Unit tests with coverage                                   |
| `pnpm duplicates`                                       | Duplicate code detection (jscpd)                           |
| `pnpm build:tauri`                                      | AppImage and `.deb` packages                               |
| `cargo test`                                            | Rust tests; also regenerates the TS bindings               |
| `cargo clippy --workspace --all-targets -- -D warnings` | Rust lint                                                  |

## Repository layout

```
apps/desktop/          Tauri 2 app: Svelte 5 interface (src/), Rust entry (src-tauri/)
crates/musubi-core/    Rust: vault, file naming, links, backlinks, index
crates/musubi-typst/   Rust: Typst compilation, HTML export, source positions
packages/editor/       TypeScript: CodeMirror 6 and the Helix mode
typst/musubi/          the `musubi` Typst package
docs/                  specifications and decisions
tools/                 repository scripts
```

Types shared between Rust and TypeScript are generated with
[ts-rs](https://github.com/Aleph-Alpha/ts-rs) into
`apps/desktop/src/lib/bindings/` when running `cargo test`.

## License

[GPL-3.0-or-later](LICENSE)
