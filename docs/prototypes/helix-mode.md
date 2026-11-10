# Prototype: Helix mode in CodeMirror 6

Issue #8. Question: no mature Helix mode exists for CodeMirror. How hard is
it to write one, and is CodeMirror 6 the right base?

**Answer: CodeMirror 6 is confirmed.** Its model (immutable state,
transactions, multiple selections, decorations) matches Helix's
selection-first editing well.

## What was built

`packages/editor`:

| File              | Role                                                                    |
| ----------------- | ----------------------------------------------------------------------- |
| `mode.ts`         | Modes (`normal`, `insert`, `select`) stored in a state field.           |
| `text.ts`         | Word motions `w`, `e`, `b` on plain text, with Helix's word boundaries. |
| `motions.ts`      | Motion commands: `h j k l`, words, `x`, `gh`, `gl`, `gs`.               |
| `editing.ts`      | `d`, `c`, `y`, `p`, `P`, `u`, `U`, `C`, `s`.                            |
| `modes.ts`        | `i`, `a`, `o`, `O`, `v`, `Escape`, `;`, command line, `:w`, `:q`.       |
| `commands.ts`     | The single command registry.                                            |
| `keymap.ts`       | Keys of each mode, mapped to command names only.                        |
| `command-line.ts` | Typed commands: `:w`, `:q`, `:wq`, `:x`.                                |
| `helix.ts`        | The CodeMirror extension: key handling, block cursor, mode classes.     |

The desktop app has a "Helix editor" tab: CodeMirror with `codemirror-lang-typst`
for highlighting (its Lezer parser, without WebAssembly), a mode indicator
(`NOR` / `INS` / `SEL`) and a command line.

## Checked against the real Helix

`tools/helix/record-helix-reference.ts` drives the real Helix (25.07.1) in a
pseudo-terminal on the key sequences of `tools/helix/helix-cases.ts`. After
each sequence it marks the start and end of the selections and the cursor
with Helix's own `:insert-output` and `:append-output` commands, and saves
the file. The result, `packages/editor/src/helix-reference.json`, is
committed; `helix-reference.test.ts` replays the same keys on the Musubi
editor and compares. The CI does not need Helix.

To add a case: add it to `helix-cases.ts`, run
`node tools/helix/record-helix-reference.ts` (Helix and `script` from
util-linux required), and commit the new reference.

**Result: the 95 recorded cases match Helix exactly** (text, selections and
cursors). The comparison caught differences that manual testing missed:

- `i` and `a` keep the selection, which moves or grows with the typed text;
  after `i` the cursor goes back to the start of the selection;
- `c` types before the character that follows the deleted text;
- after a final line break the cursor may sit on the empty last line;
- `C` skips the lines too short to hold the selection;
- after `U` the selection covers one character again;
- in select mode, `x` covers every line the selection touches, and when the
  cursor crosses the anchor, the anchor character stays selected.

## Findings

1. **Keys must never reach CodeMirror outside insert mode.** The webview
   turns `Enter`, `Backspace` or a paste into text input. The extension
   cancels every `beforeinput` event outside insert mode.
2. **Testing the real app**: `tauri-driver` with `WebKitWebDriver` drives the
   Tauri window and takes screenshots, so the rendering in WebKitGTK can be
   checked without a person at the keyboard.
3. **Block cursor**: CodeMirror draws a caret between characters. In normal
   mode the caret is hidden and the character under the cursor is marked; on
   a line break (after `x`), a block is drawn at the end of the line.
4. **System clipboard**: the Linux webview refuses
   `navigator.clipboard.readText()`. The editor goes through Tauri's
   clipboard plugin, which reads and writes the system clipboard from Rust.
   Unlike Helix, which keeps them in a register, `y`, `d` and `c` all put the
   text in the system clipboard, and `p` / `P` paste from it: the author's
   choice, so that text moves freely between Musubi and other applications.
5. Moving through a shorter line (`llllllljj`) matches Helix on the
   recorded case, but Helix's sticky column is not implemented in general;
   to add with the full scope.

## Effort for the full Helix scope

Estimate for one person who knows the code, in focused days:

| Area                                                             | Estimate        |
| ---------------------------------------------------------------- | --------------- |
| Remaining motions (`f t F T`, `gh gl gg ge`, `%`, counts)        | 2 days          |
| Text objects (`mi`, `ma`, with Typst sections), `gw` jump labels | 3 days          |
| Registers, `R`, `r`, `~`, indentation, `J`, comments             | 2 days          |
| Multiple selections (`s`, `S`, `K`, `,`, `Alt-;`, rotate)        | 2 days          |
| Space menu, command palette, `:` with completion and errors      | 2 days          |
| Search (`/`, `n`, `N`, `*`)                                      | 1 day           |
| Sticky column, view scrolling (`zz`, `Ctrl-d`)                   | 1 day           |
| More reference cases against Helix                               | 1 day           |
| **Total**                                                        | **≈ 2–3 weeks** |

No blocker found. Points to watch: input methods (accents typed with dead
keys must work in insert mode), and touch editing on Android, where a modal
editor needs another interaction model.
