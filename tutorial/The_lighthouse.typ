#import "@local/musubi:0.1.0": note-link

= The lighthouse

The keeper of the lighthouse welcomes you. Full-text search found this
note; it opens at the matching line.

== Links

A link to a note is written `#note-link("Folder/Note")[text]`. In the editor,
typing `[[` in insert mode suggests notes as you type. A link to a note that
does not exist yet shows greyed out: clicking it creates the note.
#note-link("Welcome/My_first_note")[My first note] is one: try it.

== Challenge 3

This note links to no next step. But the next step links *here*. Show the
backlinks with `Space b`: the panel on the right lists the notes that link to
this one, with the sentence around each link. Open it: `Space l` reaches the
panel, `j` and `k` move, `Enter` opens.
