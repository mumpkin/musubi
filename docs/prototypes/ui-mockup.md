# Interface mockup

Issue #10. A first layout of the interface, to try the structure and the
interface libraries before building the real screens.

## What was built

`apps/desktop/src/lib/shell/`:

| Component               | Role                                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| `Shell.svelte`          | Layout: explorer, two panes side by side, backlinks, status bar; `Ctrl+P`, `Ctrl+B`, `Ctrl+L`. |
| `Explorer.svelte`       | Notes by **title**, folders that fold; the file path shows in the tooltip.                     |
| `ReadingPane.svelte`    | A pane in reading mode (`LEC`): the note rendered by the Rust core, block cursor `j` / `k`.    |
| Editor pane             | The Helix editor on the note's source.                                                         |
| `BacklinksPanel.svelte` | Notes linking to the current one, with an excerpt.                                             |
| `StatusBar.svelte`      | Mode of the focused pane (`LEC`, `NOR`, `INS`, `SEL`) and its note.                            |
| `CommandPalette.svelte` | Fuzzy search over commands and notes.                                                          |
| `PaneHeader.svelte`     | Title, mode and actions of a pane, with tooltips.                                              |

The data is fake (`mock-vault.ts`), except the notes of the demo vault, which
are rendered for real. Opening a note from the explorer, the palette or the
backlinks opens it in the focused pane. Pane sizes are kept between sessions.

The interface is light only: the dark theme waits for milestone J2, but every
color is already a CSS variable holding both values (`light-dark()`).

## Decision on the interface libraries

**Both are adopted.**

- **PaneForge** (1.0): resizable and collapsible panes with almost no code;
  nested groups work (the two panes inside the main area); the layout is
  saved with `autoSaveId`. The resize handle is unstyled: it needed a wider
  hit area than the visible line (5 pixels for a 1-pixel line), otherwise it
  cannot be grabbed.
- **Bits UI** (2.20): `Dialog` and `Command` make the command palette
  (filtering, keyboard navigation, focus trapping, `Escape`) without any
  logic of our own; `Tooltip` for the pane actions. Components are unstyled
  and take classes, which suits plain CSS with variables.

Both support Svelte 5 runes and need no Tailwind.

## Findings

1. **Keys go to the focused pane only**: the reading view now listens on its
   own element (focusable) instead of the window, so `j` in the editor no
   longer moves the block cursor of the other pane.
2. The mode indicator moved to the status bar and the pane header; the editor
   keeps only its command line, shown while typing a command.
3. Long lines wrap in the editor: notes are prose.
4. Checked in the real Tauri window through `tauri-driver`: layout, palette,
   folding, resizing, focus and modes.

## Next steps (J1)

- Real vault: file explorer and backlinks from the Rust index.
- Pane commands (`:q` closes a pane, splits), Space menu.
- Helix navigation in the reading view (`/`, `n`, `gg`, `ge`…), with smooth
  scrolling for `zz`, `Ctrl-d`, `Ctrl-u`.
