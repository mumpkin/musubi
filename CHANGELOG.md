# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Edit the vault tree as text in the explorer, as with oil.nvim: `Space r`
  in the explorer shows every folder and note as an indented line. Changing
  a title renames the note, moving a line moves the entry, a new line
  creates a note or a folder, a deleted line moves it to the trash. `:w`
  lists the changes and applies them once confirmed; links follow.
- `>` and `<` in the editor indent and unindent the selected lines, as in
  Helix.

## [0.1.0] - 2026-11-12

### Security

- The HTML of notes is cleaned in the Rust core before it reaches the
  interface: no scripts, embedded documents, forms, event handlers or
  `javascript:` URLs. The interface and the content security policy of the
  window remain as further barriers.

### Changed

- The explorer has three foldable sections with icons: Recent, Pinned and
  Notebook, which holds every folder and note.

- In the reading view, the block selected with `j` and `k` shows with a
  faint background instead of a blue outline.

- In the reading view, `k` on the first block and `j` on the last one
  scroll to the very top and end of the note.

- The icons of the interface come from Lucide, with one size and stroke
  width: pane headers, explorer, title bar, the mark of web links. A note
  with unsaved changes shows a dot next to its title.

- Pane commands use `Space w`, as in Helix, instead of `Ctrl-w`: `Space w v`
  splits, `Space w w` goes to the next pane, `Space w q` closes it. The
  backlinks toggle moves from `Space l` to `Space b`.

### Fixed

- A new folder keeps the spaces of its name: `My folder`, not `My_folder`.

- `Space ?` opens the command palette on layouts where `?` needs `Shift`:
  modifier keys alone no longer end a `Space` sequence.

- `u` and `U` keep working after a save renames the note by its new title,
  and after coming back to the window. A note changed by another program
  while it is open in the editor is updated as one change, which `u` undoes.

- Back in the reading view after editing (`:q`, `Space r`), the keyboard
  works at once: `j` and `k` move without a click first.

### Added

- The trash shows as the last section of the explorer: click an entry to
  restore it, or delete it for good. A setting hides the section.

- Notes and folders can be archived: they move to `Archive/`, shown in
  an Archive section of the explorer, keeping their path, and links to them
  follow. The same button, or the palette, puts them back.

- Folders go to the trash with everything in them (button on hover in
  the explorer, or "Move the folder of the note to the trash"), and come
  back the same way.

- In the reading view, `l` and `h` move between the links of the selected
  block and `Enter` follows the selected one.

- `Space n` accepts a path: `Projects/Ideas/My note` creates the note in
  `Projects/Ideas`, and the missing folders with it.

- The tutorial is a treasure hunt: six steps, each with a challenge that
  uses a feature (the source of a note, search, backlinks, Helix multiple
  selections, pins, themes, panes, the graph, renaming, the trash) and
  leads to the next. _Helix basics_, _Typst basics_ and _Using Musubi_ stay
  as references; _Musubi features_ is folded into the steps.

- A settings screen (`Space ,` or "Open the settings" in the palette): the
  theme, autosave and its delay, which belong to the device, and the number
  of days deleted notes stay in the trash, stored in the vault. Changes
  apply at once.

- Color themes: GitHub Light and GitHub Dark, with colors from GitHub's VS
  Code theme, follow the light or dark preference of the system. The palette
  chooses a theme, imports one from a JSON file (`docs/themes.md`) or
  removes it; the choice applies at once and stays on the device. The
  editor, code blocks, math and the shapes drawn by Typst follow the theme.

- The explorer shows the pinned notes and the 10 notes opened last. A note
  is pinned with the pin button of its row or "Pin or unpin the note" in the
  palette. Pins are stored in the vault (`.musubi/vault.json`), so every
  copy shows them; recent notes stay on the device. Both follow renames and
  leave with the trash.

- Web links (`http`, `https`, `mailto`) open in the default browser, never
  inside the window. In the reading view a small icon tells them from note
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

[Unreleased]: https://github.com/mumpkin/musubi/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/mumpkin/musubi/releases/tag/v0.1.0
