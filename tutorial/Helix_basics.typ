#import "@local/musubi:0.1.0": note-link

= Helix basics

The editor works like #link("https://helix-editor.com")[Helix]: you first
*select* text, then say what to do with it. Keys do not type text unless you
are in *insert* mode. Press `i` now to read this note in the editor, and
practise on the lines under each exercise.

== Modes

The status bar shows the mode:

- `NORMAL`: keys move and act on selections.
- `INSERT`: keys type text. `i` inserts before the selection, `a` after
  it, `o` and `O` open a new line below or above. `Escape` goes back to
  normal mode.
- `SELECT`: `v` makes every move extend the selection; `v` or `Escape`
  leaves it.

== Moving

- `h`, `j`, `k`, `l`: left, down, up, right (the arrows work too).
- `w`: select to the start of the next word, `e` to its end, `b` back to the
  start of the previous one.
- `gh` and `gl`: start and end of the line; `gs`: first character that is not
  a space.
- `gg`: first line, `ge`: last line, `12G`: line 12.
- `gw`: two-letter labels appear on the words of the screen; type one to jump
  there.
- A number before a move repeats it: `3w`, `5j`.

*Exercise*: put the cursor on the first word below, then press `w` four times
and watch the selection move from word to word.

one two three four five

== Acting on the selection

- `x`: select the whole line; again to add the next one.
- `d`: delete the selection. `c`: delete it and type instead (insert mode).
- `y`: copy the selection, `p` and `P`: paste after or before it.
- `u`: undo, `U`: redo.
- `;`: reduce the selection to the cursor.

*Exercise*: on the line below, select `wrong` with `w` and replace it with
`right` using `c`, then `Escape`.

This line is wrong.

*Exercise*: delete the line below with `x` then `d`, and bring it back with
`u`.

Delete me, then undo.

== Searching and selecting

- `/` searches forward, `?` backward; `n` and `N` go to the next and the
  previous match. Text without capitals ignores case.
- `*` searches for the selected text.
- `s` selects, inside the selection, every match of what you type: one
  cursor per match. Edit them all at once, then `;` or `Escape`.
- `C` adds a cursor on the next line.

*Exercise*: select the three lines below with `x x x`, press `s`, type `cat`
and `Enter`, then `c` and type `dog`: three cats become dogs.

a cat \
another cat \
the last cat

== Pairs and surroundings

- `mm`: jump to the matching bracket.
- `mi(` selects inside the parentheses around the cursor, `ma(` with them.
  It works with `[`, `{`, `"` and the other pairs.
- `ms(` surrounds the selection with parentheses, `md(` removes them,
  `mr([` replaces them with brackets.
- In insert mode, typing `(`, `[`, `{` or a quote before a space or the end
  of a line also types the closing one.

*Exercise*: put the cursor inside the parentheses below and press `mi(` then
`d`.

Remove (all of this) text.

== Saving and leaving

`:w` saves, `:q` goes back to reading, `:wq` (or `:x`) does both, `:q!`
leaves without saving. A note with unsaved changes shows `●` next to its
title.

Next: #note-link("Welcome/Typst_basics")[Typst basics].
