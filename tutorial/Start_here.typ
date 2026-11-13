#import "@local/musubi:0.1.0": note-link

= Start here

Welcome to Musubi: notes written in *Typst*, edited the *Helix* way, linked
to each other. This tutorial is a *treasure hunt*: each note is a step with
a small challenge, and solving it shows you the way to the next one. These
are normal notes of your vault, in the `Welcome` folder: change them, break
them, delete them once you know your way.

== Reading and editing

A note opens in the *reading view*: the note as it looks, not its source.
The header of the pane shows `READ`.

- `j` and `k` select the next and the previous block, `gg` and `ge` go to
  the top and the end, `Ctrl-d` and `Ctrl-u` scroll by half a screen.
- `i`, or a double click on a paragraph, *edits* the note at that place. The
  header of the pane shows `NORMAL`.
- In the editor, `:q` then `Enter` goes back to reading, `:w` saves, `:wq`
  does both. `Space r` switches without typing a command.

== Challenge 1

The way forward is not written in this view: it is hidden in the *source*
of this note, at the very end. Press `ge` to select the last block, `i` to
edit it, and read the line that starts with `//`, a Typst comment. Then
`:q` and `Enter`, and do what it says.

Lost? `Space ?` opens the command palette: every command, with its
shortcut, and every note.

This is the last block of the note.

// Well done! Press Space f, type "find anything" and Enter.
