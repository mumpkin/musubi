#import "@local/musubi:0.1.0": note-link

= Using Musubi

A guide to the whole app. Come back to it when you look for something; the
command palette (`Space ?`) lists the same commands.

== The window

- *Title bar*: the title of the current note, and the buttons of the window.
- *Explorer*, on the left (`Space e`): folders and notes by title. The
  buttons next to the vault name create a note and a folder; the new note
  button next to a folder creates a note in it. The pin and trash buttons of
  a note show when the pointer is over it. On top, *Pinned* lists the notes
  you pinned and *Recent* the last 10 notes opened on this computer; both
  fold like folders.
- *Panes*, in the middle: one, or two side by side. Each pane shows a note,
  read or edited, or the graph. Drag the line between panes to resize them.
- *Backlinks*, on the right (`Space b`): the notes that link to the current
  one.
- `Space h` and `Space l` move the keyboard to the panel on the left and on
  the right, folded panels skipped. In the explorer and the backlinks, `j`
  and `k` move, `Enter` or `l` opens a note or folds a folder, `Escape` goes
  back to the pane.
- *Status bar*, at the bottom: the mode (`READ`; `NORMAL`, `INSERT`,
  `SELECT` in the editor; `GRAPH`), the path of the note, messages, and a
  reminder of the main keys.

== Shortcuts of the window

They work everywhere except while typing text.

#table(
  columns: 2,
  [*Keys*], [*Action*],
  [`Space ?` or `Ctrl-p`], [Command palette],
  [`Space f`], [Find a note by title],
  [`Space /`], [Search the text of the notes],
  [`Space n`], [New note],
  [`Space ,`], [Settings],
  [`Space e`], [Show or hide the explorer],
  [`Space b`], [Show or hide the backlinks],
  [`Space h`, `Space l`], [Panel on the left, on the right],
  [`Space g`], [Graph of the links, or back to the note],
  [`Space r`], [Switch between reading and editing],
  [`Space w v`], [Split the pane],
  [`Space w w`], [Next pane],
  [`Space w q`], [Close the pane],
)

== Reading view

#table(
  columns: 2,
  [*Keys*], [*Action*],
  [`i`, double click], [Edit the note at the selected block],
  [`j`, `k`], [Next, previous block],
  [`gg`, `ge`, `12G`], [First block, last block, block of line 12],
  [`/`, `?`, `n`, `N`], [Search in the note, next and previous match],
  [`Ctrl-d`, `Ctrl-u`], [Half a screen down, up],
  [`Ctrl-f`, `Ctrl-b`], [A screen down, up],
  [`zz`, `zt`, `zb`], [Selected block in the middle, at the top, at the bottom],
  [`Escape`], [Hide the selection and the matches],
)

Click a link to open its note. Footnote numbers and the entries of an
outline scroll to their place. Web links, marked with a small external link icon like
#link("https://typst.app")[the Typst website], open in your browser.

== Editor

The editor follows Helix; #note-link("Welcome/Helix_basics")[Helix basics]
explains its keys. The commands of the command line (`:`):

#table(
  columns: 2,
  [*Command*], [*Action*],
  [`:w`], [Save],
  [`:q`], [Back to reading; refuses unsaved changes],
  [`:q!`], [Back to reading, dropping the changes],
  [`:wq`, `:x`], [Save, then back to reading],
)

In insert mode, `[[` links to a note, `Ctrl-v` pastes an image. Dropping an
image on the editor inserts it too.

== Notes

- *Create*: `Space n`, or the new note button in the explorer. The file is
  named from the title. Type a path to choose the folder:
  `Projects/Ideas/My note` creates _My note_ in `Projects/Ideas`, and the
  missing folders with it.
- *Rename*: change the first `=` heading and save. The file, its images and
  every link to it follow.
- *Pin*: the pin button in the explorer, or "Pin or unpin the note" in the
  palette. Pins are saved in the vault: every copy of it shows them. A
  renamed note stays pinned; a note moved to the trash is unpinned.
- *Delete*: the trash button in the explorer, or "Move the note to the
  trash" in the palette. "Show the trash" restores notes or deletes them for
  good. Notes stay 30 days in the trash; the settings change the delay.
- *Changes made elsewhere* (another program, a sync tool) show when you come
  back to the window.

== Settings and themes

`Space ,` opens the settings; every change applies at once.

- *Theme*: Musubi follows the light or dark preference of the system, with
  the colors of GitHub Light and GitHub Dark, or uses the theme you choose.
  "Import a theme" adds one from a JSON file; the guide `docs/themes.md` of
  the repository describes the format. The palette has the same commands:
  type `theme` in it.
- *Editor*: save automatically after a few seconds without typing.
- *Trash of this vault*: how many days deleted notes stay in the trash
  (0 keeps them).

The theme and autosave are settings of this computer; the trash delay
belongs to the vault, so every copy of it uses the same.

== Where your notes live

Your vault is an ordinary folder; Musubi only reads and writes files in it.

- Each note is a `.typ` file, readable and compilable with Typst itself.
- The images of a note are in a folder next to it, `Note.assets/`.
- `.musubi/` holds the settings of the vault, its pinned notes and the
  trash.
- The search index, the recent notes and the window layout stay on this
  computer, outside the vault: deleting them loses nothing.

Musubi has no sync of its own. To use your notes on several devices, sync
the folder with the tool you like: Syncthing, Nextcloud, git…

Back to #note-link("Welcome/Start_here")[Start here].
