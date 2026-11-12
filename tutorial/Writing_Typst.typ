#import "@local/musubi:0.1.0": card, done, note-link, todo

= Writing Typst

Notes are written in Typst: `=` for headings, `-` for lists, `*bold*`,
`_italic_`, `$x^2$` for math. #note-link("Welcome/Typst_basics")[Typst
basics] shows the rest: tables, code, images.

Musubi adds a few functions: tasks and flashcards.

- #todo[Finish the treasure hunt]
- #done[Find the graph]

#card[What opens the settings?][`Space ,`]

== Challenge 6

Two last trials:

+ *Rename* this note: edit it, change its first heading to
  `= Typst is written`, and save with `:w`. The file is renamed from the
  title, and every link to it follows: look at the backlinks.
+ *Trash and restore*: create a note with `Space n`, move it to the trash
  with "Move the note to the trash" in the palette, then bring it back with
  "Show the trash".

You made it to the end of the hunt. The treasure is the
#note-link("Welcome/Using_Musubi")[reference card]: the whole app on one
page, to come back to later.

Linked from #note-link("Welcome/Pins_and_themes")[Pins and themes].
