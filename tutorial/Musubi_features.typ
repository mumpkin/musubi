#import "@local/musubi:0.1.0": card, done, note-link, todo

= Musubi features

== Links between notes

In the editor, in insert mode, type `[[` and a few letters of a title: a
list of notes opens. `Enter` writes the link, for example
#note-link("Welcome/Start_here")[Start here]. Type `[[Start here#` to link to
a section of a note, like #note-link("Welcome/Start_here", section: "Panes and panels")[its panes].

A link to a note that does not exist yet, like
#note-link("Welcome/My_first_note")[My first note], shows greyed out: click
it to create the note, titled from the link.

When a note changes its title, its file is renamed and every link to it
follows.

== Backlinks

`Space b` shows, on the right, the notes that link to the current one, with
the sentence around each link. Open #note-link("Welcome/Start_here")[Start
here] and look: this note is there.

== Flashcards

`#card[question][answer]` writes a card; `reverse: true` asks it both ways.

#card[What opens the command palette?][`Space ?` or `Ctrl-p`]

#card(reverse: true)[chat][cat]

== Tasks

- #todo[Read the tutorial]
- #done[Open Musubi]

== Images

Paste an image with `Ctrl-v` or drop it on the editor: it is copied into the
note's `.assets` folder, and pasting the same image twice keeps one copy.
Inside `#image("…")`, the files of the note complete as you type.

== Search

- `Space f` finds a note from a few letters of its title.
- `Space /` searches the text of every note, accents and case ignored; the
  note opens where the words are.
- In a note, `/` searches its text, `n` goes to the next match.

== Graph

`Space g` shows the graph of your notes and their links. Scroll to zoom,
drag to move around or to move a note, click a note to open it. `Space g`
again goes back to the note.

== Trash

The trash button of a note in the explorer (or "Move the note to the trash"
in the palette) moves it to the trash with its images. "Show the trash" in
the palette restores it. Notes stay there 30 days, or as long as the
settings (`Space ,`) say.

Next: #note-link("Welcome/Using_Musubi")[Using Musubi].
