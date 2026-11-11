#import "@local/musubi:0.1.0": note-link

= Start here

Welcome to Musubi: notes written in *Typst*, edited the *Helix* way, linked
to each other. These notes are a short tutorial. They are normal notes of
your vault, in the `Welcome` folder: change them, try things in them, delete
them once you know your way.

== Reading and editing

A note opens in the *reading view*: the note as it looks, not its source.
The status bar shows `READ`.

- Press `i`, or double click a paragraph, to *edit* the note at that place.
  The status bar shows `NORMAL` (normal mode of the editor).
- In the editor, type `:w` then `Enter` to save, and `:q` to go back to
  reading. `:wq` does both.
- `Space r` switches between reading and editing without leaving the note.

Try it now: press `i` on this paragraph, then `:q` and `Enter` to come back.

== Moving in a note

In the reading view, `j` and `k` select the next and the previous block,
`gg` goes to the top and `ge` to the end. `Ctrl-d` and `Ctrl-u` scroll by half
a screen, smoothly. `Escape` hides the selection.

== Panes and panels

- `Ctrl-w v` splits the window: the same note, read on one side and edited on
  the other. `Ctrl-w w` moves between the two panes, `Ctrl-w q` closes one.
- `Space e` shows or hides the explorer, on the left. `Space l` shows or
  hides the backlinks, on the right.

== Finding anything

`Space ?` (or `Ctrl-p`) opens the *command palette*: every command, with its
shortcut, and every note. Type a few letters to filter it. When you forget a
key, look there.

== Next

+ #note-link("Welcome/Helix_basics")[Helix basics]: move and edit with the
  keyboard.
+ #note-link("Welcome/Typst_basics")[Typst basics]: write headings, lists,
  math, code and images.
+ #note-link("Welcome/Musubi_features")[Musubi features]: links, backlinks,
  cards, tasks, search, graph.
+ #note-link("Welcome/Using_Musubi")[Using Musubi]: the whole app, every
  shortcut, and where your notes live.
