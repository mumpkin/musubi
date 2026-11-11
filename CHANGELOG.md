# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security

- The HTML of notes is cleaned in the Rust core before it reaches the
  interface: no scripts, embedded documents, forms, event handlers or
  `javascript:` URLs. The interface and the content security policy of the
  window remain as further barriers.

### Changed

- Pane commands use `Space w`, as in Helix, instead of `Ctrl-w`: `Space w v`
  splits, `Space w w` goes to the next pane, `Space w q` closes it. The
  backlinks toggle moves from `Space l` to `Space b`.

### Fixed

- `u` and `U` keep working after a save renames the note by its new title,
  and after coming back to the window. A note changed by another program
  while it is open in the editor is updated as one change, which `u` undoes.

- Back in the reading view after editing (`:q`, `Space r`), the keyboard
  works at once: `j` and `k` move without a click first.

### Added

- The explorer shows the pinned notes and the 10 notes opened last. A note
  is pinned with the pin button of its row or "Pin or unpin the note" in the
  palette. Pins are stored in the vault (`.musubi/vault.json`), so every
  copy shows them; recent notes stay on the device. Both follow renames and
  leave with the trash.

- Web links (`http`, `https`, `mailto`) open in the default browser, never
  inside the window. In the reading view a small arrow tells them from note
  links, and their address shows on hover.

- Every panel is reached the same way with the keyboard: `Space h` and
  `Space l` move to the panel on the left and on the right (explorer, panes,
  backlinks). In the explorer and the backlinks, `j` and `k` move, `Enter`
  or `l` opens, `Escape` goes back to the note.

- Modes are named in full in the pane headers and the status bar: `READ`,
  `NORMAL`, `INSERT`, `SELECT`, `GRAPH`. The handles between panels no
  longer light up on hover; the resize cursor shows them.

- A new vault starts with a tutorial in a `Welcome` folder: _Start here_,
  _Helix basics_ with exercises, _Typst basics_, _Musubi features_ and
  _Using Musubi_, a guide to the whole app. "Open the tutorial" in the
  command palette brings back the missing notes without touching the others.
- Open a folder as a vault; the last vault reopens at launch.
- Note explorer listing notes by title, with folders that fold.
- Create notes and folders (`Space n`), named from their title.
- Save notes with `:w`; `:q` closes the pane and refuses unsaved changes
  (`:q!` discards them), `:wq` and `:x` save then close. Reading panes
  render the note again on save; notes changed by another program reload
  when the window gets the focus back.
- Changing the title of a note renames its file and its `.assets` folder,
  and updates the links and image paths that point to it.
- Edit a note from the reading view at the selected block (`i` or double
  click); back in the reading view, the block under the editor cursor shows.
- Backlinks panel (`Space l`): the notes linking to the current one, with
  the sentence around each link; click one to open it. Links, cards and
  tasks are indexed in the app data directory, never in the vault, and the
  index rebuilds itself when deleted.
- Links to notes that do not exist yet show greyed out with a dashed
  underline; following one creates the note, titled from the link text.
- Type `[[` in insert mode to link to a note: a fuzzy search over titles
  (the matcher of Helix), with the folder when titles are shared; `Enter`
  inserts the `note-link` and the `musubi` import if missing.
  `[[Note#` lists the headings of that note to link to a section.
- Find a note by title with `Space f`, and search the text of every note
  with `Space /`, ignoring accents and case, with the matched words
  highlighted; the note opens at the matching block.
- Helix navigation in the editor and the reading view: `gg`, `ge`, `G`
  and counts (`3j`, `10G`), search with `/`, `?`, `n`, `N` and `*`, `zz`,
  `zt`, `zb`, `Ctrl-d`, `Ctrl-u`, `Ctrl-f`, `Ctrl-b`. `j` and `k` keep the
  column. In the reading view, `/` highlights the matches in the rendered
  text and moves the block cursor to them. Every scroll is smooth.
- Paste (`Ctrl-v`) or drop an image in the editor: it is copied into the
  `.assets` folder of the note, and `#image("Note.assets/…")` is inserted
  on its own line. The same image pasted twice is stored once. Paths of
  the note's files complete inside `#image("…")`.
- Deleting a note (trash button of the explorer, or the command palette)
  moves it and its images to the trash of the vault. The trash (command
  palette, "Show the trash") restores notes, under a free name if the path
  is taken, and deletes them for good after a second click. Entries older
  than `trashRetentionDays` (30 by default) are purged when the vault
  opens.
- The reading view shows every element of a note: figures, terms,
  footnotes (their links scroll to the note), outlines, highlights, web
  links, table headers, images. What Typst cannot export to HTML (shapes,
  grids, rotations, placement…) is drawn as an SVG island instead of
  disappearing.
- Graph of the notes and their links (`Space g` in a pane, or the command
  palette): zoom and pan, drag notes, hover to read a title, click to open
  the note. The current note is highlighted.
- Insert mode pairs `(`, `[`, `{` and quotes as Helix does, steps over a
  typed closing character and deletes an empty pair with `Backspace`.
- Reading and editing panes, side by side, with Helix-style shortcuts
  (`Space ?`, `Space e`, `Ctrl-w v`…).

- `musubi` Typst package: `note-link` for links between notes, `card` for
  flashcards, `todo` and `done` for tasks. Notes using it still compile with
  the Typst command-line tool.
