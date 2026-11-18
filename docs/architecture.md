# Architecture

How the code of Musubi fits together, and where to change what. The
[vault format](./vault-format.md) describes the files on disk; this guide
describes the program around them.

## Overview

```
┌──────────────────────── apps/desktop (Tauri 2) ────────────────────────┐
│  src/ — Svelte 5 interface             src-tauri/ — Rust entry point   │
│  panes, explorer, graph, settings… ──► commands (invoke) ──┐           │
│        ▲                                                    ▼           │
│        │ generated types (ts-rs)        crates/musubi-core  vault,      │
│        └─────────────────────────────── index (SQLite), links, cards   │
│                                          crates/musubi-typst  Typst →  │
│  packages/editor — CodeMirror 6 +        HTML, source positions        │
│  the Helix profile                                                      │
└──────────────────────────────────────────────────────────────────────────┘
```

- **The files are the truth.** Everything Musubi shows can be rebuilt from
  the vault folder; the index is a cache.
- **Rust owns the files**, the interface never touches the disk: it calls
  Tauri commands and shows what they return.
- **The editor knows nothing of Musubi**: `packages/editor` is a CodeMirror
  extension that the app configures through a small host interface.

## Rust

### `crates/musubi-typst`: Typst to HTML

`NoteCompiler` compiles one note with the Typst compiler, keeping its caches
between compilations.

| Module                          | Role                                                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `world.rs`, `files.rs`          | The Typst `World` of a vault: its files, the vault root as project root, the embedded package              |
| `package.rs`                    | The `musubi` Typst package (`@local/musubi`), embedded: notes compile without installing it                |
| `entry.rs`, `entry.typ`         | Wraps a note for the HTML export (show rules for blocks, boxes, math)                                      |
| `blocks.rs`, `source_map.rs`    | Top-level blocks and their source lines: each rendered element carries `data-block`                        |
| `sanitize.rs`                   | Removes from the HTML what could run code                                                                  |
| `fallback.rs`, `diagnostics.rs` | Errors and warnings; a note importing a package Musubi cannot load still shows, with notices               |
| `index.rs`, `task_marks.rs`     | Links, cards and tasks the package emits, for the index; where each task is, so its checkbox can switch it |

`render` returns a `RenderedNote` (HTML, diagnostics, blocks, what the index
needs). Titles come from the source itself (`musubi-core/src/title.rs`).

### `crates/musubi-core`: the vault

`Vault` is a folder of notes. Its operations live in modules that each add
methods to it: `vault.rs` (listing, reading, writing, creating), `rename.rs`
(titles, file names, rewriting links after a rename), `trash*.rs`,
`archive.rs`, `pins.rs`, `recent.rs`, `conflicts.rs` (copies left by sync
tools), `tree_edit.rs` (the tree edited as text), `assets.rs` (images),
`tutorial.rs`. `naming.rs` and `title.rs` turn titles into file names and
back; `links.rs` reads and rewrites `note-link` calls with `typst-syntax`.

`VaultIndex` (`index/`) is a SQLite database per vault, in the local data of
the device (never in the vault): tables `notes`, `links`, `cards`, `tasks`
and a full-text table `passages`. `refresh` compares the time and size of
every note with what it indexed and compiles again only the notes that
changed. Backlinks, the graph, text search and due flashcards are queries on
it. `cards/` schedules reviews with FSRS from the review logs of every
device (`.musubi/reviews/`).

`error.rs`: `VaultError`, whose messages are written for the user.

### `apps/desktop/src-tauri`: commands

One module per area (`vault.rs`, `links.rs`, `explorer.rs`, `trash.rs`,
`reading.rs`, `reviews.rs`, `assets.rs`, `conflicts.rs`, `settings.rs`,
`preferences.rs`, `themes.rs`), each command a thin function:

```rust
#[tauri::command(async)]
pub fn retitle_note(path: &str, title: &str, state: State<'_, AppState>)
	-> Result<String, String> {
	state.change(|open| open.vault.retitle_note(path, title).message())
}
```

- `AppState` (`state.rs`) holds the open vault (`OpenVault`: the vault, its
  compiler and its index) behind a mutex. `with_open` runs an action on it;
  `change` also refreshes the index afterwards. `message()` turns any error
  into the string the interface shows.
- Commands are `async` so that they run off the main thread: the window
  stays responsive during a compilation.
- `DeviceSettings` (settings of this computer, with `Preferences`) is a JSON
  file in the config folder of the app; settings of a vault are in
  `.musubi/vault.json`.
- Types shared with the interface derive `ts_rs::TS` with
  `#[ts(export)]`: `cargo test` writes them to
  `apps/desktop/src/lib/bindings/`, and CI fails if they are stale.

## Interface (`apps/desktop/src`)

Svelte 5 with runes. State lives in classes in `*.svelte.ts` files; the
components read it and call its methods.

| Folder                          | Role                                                                                           |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| `shell/`                        | The frame: `Shell.svelte`, title bar, side panels, `VaultState` (tree, recent notes, settings) |
| `panes/`                        | Panes and `PaneManager`: which note each pane shows, in which mode, splits, saves              |
| `reading/`                      | Reading view: the HTML of a note, block cursor, search, links                                  |
| `editor/`                       | The note editor around `packages/editor`, autosave, images                                     |
| `explorer/`, `tree-edit/`       | The explorer, its menus and drag and drop; the tree edited as text                             |
| `graph/`                        | The graph: data, d3-force layout, drawing on a canvas, its panel                               |
| `review/`, `home/`, `conflict/` | The other pane modes                                                                           |
| `palette/`, `dialogs/`          | Command palette, search pickers, dialogs and the questions they ask                            |
| `shortcuts/`                    | The `Space …` shortcuts and the shell actions they run                                         |
| `settings/`, `theme/`           | Settings dialog and preferences; color themes as CSS variables                                 |
| `ui/`                           | Shared pieces: icons, tooltips, notices, list keys                                             |
| `vault/`                        | Calls to the commands of the core, and helpers on paths and trees                              |

A **pane** shows one note in a mode: `reading`, `editing`, `graph`,
`review`, `home` or `conflict` (`panes/panes.ts`). `PaneManager` changes
modes, opens notes, and asks before leaving unsaved changes.

**Reading a note**: `ReadingView` calls `render_note`, sanitizes the HTML
again (`note-html.ts`), marks links to missing notes, and lets
`ReadingNavigator` move a block cursor over the elements that carry
`data-block`; `i` opens the editor at the source line of that block.

**Graph**: `GraphLayout` keeps the notes and a d3-force simulation; drawing
is done by hand on a canvas (`graph-draw.ts`, `graph-draw-titles.ts`), with
titles placed so that they never overlap and smooth fades
(`graph-fades.ts`).

## Editor (`packages/editor`)

The Helix profile on CodeMirror 6. Keys (`keymap.ts`) only name commands of
a registry (`commands.ts`); `runCommand` runs one, as one undo step
(`undo-history.ts`). The mode (normal, insert, select) is a state field
(`mode.ts`). The app gives the editor an `EditorHost` (open a prompt, write,
quit…) and gets back mode changes.

Behavior must match the real Helix: `tools/helix/helix-cases.ts` (and the
files it gathers) lists key sequences, `tools/helix/record-helix-reference.ts`
replays them in Helix and records `helix-reference.json`, and
`helix-reference.test.ts` replays them in the editor.

## How to…

**Add a command of the core.** Write the operation on `Vault` (or
`VaultIndex`) in `musubi-core`, with a test in `crates/musubi-core/tests/`.
Add a command in the matching module of `src-tauri/src` using `with_open`
or `change`, and register it in `lib.rs`. Call it from a module of
`apps/desktop/src/lib/vault/`.

**Add a setting of this device.** Add a field to `Preferences`
(`preferences.rs`) with its default and its bounds in `validate`; run
`cargo test` for the bindings. Apply it in `settings/preferences.ts` and
show it in a section of the settings dialog with `SettingRow`.

**Add a key of the editor.** Add the case to the Helix cases and record the
reference with the real Helix first; then add the command to the registry
and the key to `keymap.ts` until the reference test passes.

**Add a shortcut of the window.** Add the action to `ShellAction` and its
label in `shortcuts/shortcuts.ts`, its sequence in the same file, and what
it does in `shortcuts/shell-actions.ts`. It shows in the palette by itself.

**Measure.** `cargo run --release -p musubi-core --example bench` times the
core on generated vaults ([performance](./performance.md)).
