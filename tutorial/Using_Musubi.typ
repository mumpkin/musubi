#import "@local/musubi:0.1.0": note-link

= Using Musubi

A guide to the whole app. Come back to it when you look for something; the
command palette (`Space ?`) lists the same commands.

== The window

- *Title bar*: the title of the current note, and the buttons of the window.
- *Explorer*, on the left (`Space e`): folders and notes by title. `+` next
  to the vault name creates a note, the folder button a folder; `+` next to
  a folder creates a note in it. The trash button of a note shows when the
  pointer is over it.
- *Panes*, in the middle: one, or two side by side. Each pane shows a note,
  read or edited, or the graph. Drag the line between panes to resize them.
- *Backlinks*, on the right (`Space l`): the notes that link to the current
  one.
- *Status bar*, at the bottom: the mode (`LEC` reading, `NOR`, `INS`, `SEL`
  in the editor, `GRA` graph), the path of the note, messages, and a
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
  [`Space e`], [Show or hide the explorer],
  [`Space l`], [Show or hide the backlinks],
  [`Space g`], [Graph of the links, or back to the note],
  [`Space r`], [Switch between reading and editing],
  [`Ctrl-w v`], [Split the pane],
  [`Ctrl-w w`], [Next pane],
  [`Ctrl-w h`, `Ctrl-w l`], [Pane on the left, on the right],
  [`Ctrl-w q`], [Close the pane],
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
outline scroll to their place.

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

- *Create*: `Space n`, or `+` in the explorer. The file is named from the
  title.
- *Rename*: change the first `=` heading and save. The file, its images and
  every link to it follow.
- *Delete*: the trash button in the explorer, or "Move the note to the
  trash" in the palette. "Show the trash" restores notes or deletes them for
  good. Notes stay 30 days in the trash.
- *Changes made elsewhere* (another program, a sync tool) show when you come
  back to the window.

== Where your notes live

Your vault is an ordinary folder; Musubi only reads and writes files in it.

- Each note is a `.typ` file, readable and compilable with Typst itself.
- The images of a note are in a folder next to it, `Note.assets/`.
- `.musubi/` holds the settings of the vault and the trash.
- The search index and the window layout stay on this computer, outside the
  vault: deleting them loses nothing.

Musubi has no sync of its own. To use your notes on several devices, sync
the folder with the tool you like: Syncthing, Nextcloud, git…

Back to #note-link("Welcome/Start_here")[Start here].
