#import "@local/musubi:0.1.0": note-link

= Using Musubi

A guide to the whole app. Come back to it when you look for something; the
command palette (`Space ?`) lists the same commands.

== The window

- *Title bar*: the title of the current note, and the buttons of the window.
- *Explorer*, on the left (`Space e`): folders and notes by title. The
  buttons next to the vault name edit the tree as text, create a note and a
  folder. A right click on a note or a folder, or `Shift-F10` on the entry
  under the keyboard, opens its menu: open, pin, new note or folder in it,
  rename or move, archive, trash. Long titles end with "…": the tooltip
  shows the full path. Three sections fold like folders:
  *Recent*, the four notes modified last; *Pinned*, the notes
  you pinned; *Notebook*, all your folders and notes. Below come *Archive*
  and *Trash*, when they are not empty; the settings can hide the trash.
- *Panes*, in the middle: one, or two side by side. Each pane shows a note,
  read or edited, or the graph. Drag the line between panes to resize them.
- *Backlinks*, on the right (`Space b`): the notes that link to the current
  one.
- `Space h` and `Space l` move the keyboard to the panel on the left and on
  the right, folded panels skipped. In the explorer and the backlinks, `j`
  and `k` move, `Enter` or `l` opens a note or folds a folder, `Escape` goes
  back to the pane. A note opened from the backlinks takes the keyboard:
  `j` and `k` move in it at once.
- The header of each pane shows its mode: `READ`; `NORMAL`, `INSERT`,
  `SELECT` in the editor; `GRAPH`. The panel with the keyboard (explorer,
  pane, backlinks) has its header highlighted. Messages (saved, errors)
  show for a few seconds at the bottom right.

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
  [`Space c`], [Review the flashcards],
  [`Space r`], [Switch between reading and editing; in the explorer, edit
  the tree as text],
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
  [`l`, `h`, `Enter`], [Next, previous link of the block; follow it],
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

- *Create*: `Space n`, the new note button of the explorer, or the menu of
  a folder. The file is
  named from the title. Type a path to choose the folder:
  `Projects/Ideas/My note` creates _My note_ in `Projects/Ideas`, and the
  missing folders with it.
- *Rename*: change the first `=` heading and save. The file, its images and
  every link to it follow.
- *Pin*: the menu of the note in the explorer, or "Pin or unpin the note" in the
  palette. Pins are saved in the vault: every copy of it shows them. A
  renamed note stays pinned; a note moved to the trash is unpinned.
- *Archive*: the menu of a note or a folder in the explorer, or
  "Archive or unarchive the note" in the palette. It moves to the `Archive`
  folder, shown in the *Archive* section, and links to it follow; the same
  menu puts it back.
- *Delete*: the menu of the note in the explorer, or "Move the note to the
  trash" in the palette. Folders go to the trash the same way, with
  everything in them. "Show the trash", or the *Trash* section of the
  explorer (a click restores an entry, its menu deletes it for good),
  restores notes and folders or deletes them for good. A link to a
  note in the trash shows greyed, as a link to a missing note: restoring the
  note makes it work again. Notes stay 30 days in the trash; the settings change the delay.
- *Changes made elsewhere* (another program, a sync tool) show when you come
  back to the window.

== Edit the tree as text

`Space r` in the explorer, or its pencil button, turns it into an editor
holding every folder and note of the vault, one per line, as in the
oil.nvim plugin of Neovim. Folders end with `/`; what a folder holds is
indented under it. Edit it with the Helix keys, then `:w`:

- change a title to rename the note, a folder name to rename the folder;
- cut a line (`x` then `d`) and paste it (`p`) under another folder to move
  it, or change its indentation with `>` and `<`;
- add a line to create a note, or a folder if it ends with `/`;
  `Projects/Ideas/` creates both folders;
- delete a line to move the note or the folder to the trash.

Before anything changes, a window lists what will happen: `y` applies it,
`n` goes back to the text. Links follow renamed and moved notes. A line
that cannot work is underlined, with the reason, and nothing changes.
`Enter` opens the note of the line; `:q` goes back to the explorer, `:q!`
drops the changes.

== Settings and themes

`Space ,` opens the settings; every change applies at once.

- *Vault*: the open vault, the vaults opened before on this computer (a
  click opens one), and "Open a folder…" for another; an empty folder
  becomes a new vault, with this tutorial. Save your changes first.
- *Theme*: Musubi follows the light or dark preference of the system, with
  the colors of Ayu Light and Ayu Mirage, or uses the theme you choose
  (GitHub Light and GitHub Dark are there too).
  "Import a theme" adds one from a JSON file; the guide `docs/themes.md` of
  the repository describes the format. The palette has the same commands:
  type `theme` in it.
- *Editor*: save automatically after a few seconds without typing;
  relative line numbers, as in Helix: the other lines show their distance
  to the cursor, handy for `5j`.
- *Flashcards*: how many new cards a review brings each day (20 by
  default).
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
- The search index and the window layout stay on this
  computer, outside the vault: deleting them loses nothing.

Musubi has no sync of its own. To use your notes on several devices, sync
the folder with the tool you like: Syncthing, Nextcloud, git…

Back to #note-link("Welcome/Start_here")[Start here].
