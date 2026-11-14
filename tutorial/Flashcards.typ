#import "@local/musubi:0.1.0": card, note-link

= Flashcards

Cards live in your notes, written with `card`: the question, then the
answer. The review comes back to each card when you are about to forget
it, as Anki does (with the FSRS algorithm).

#card[What starts a review of the flashcards?][`Space c`]
#card[What shows the answer during a review?][`Enter`]
#card(reverse: true)[un chat][a cat]

The last one has `reverse: true`: it is asked both ways, _un chat_ → _a
cat_ and _a cat_ → _un chat_. Math works too:

#card[$integral_0^1 x dif x$][$1/2$]

== Challenge 7

+ Press `Space c`: the review shows the cards that are due, new ones
  first-time included.
+ `Enter` shows the answer; rate it with `1` (again), `2` (hard), `3`
  (good) or `4` (easy). As in Anki, a card you are still learning (rated
  _again_ or _hard_, or seen once) comes back in the same review, after
  the others: the review ends when every card is a day or more ahead.
+ When nothing is due, `Escape` goes back to the note.

The number next to the vault name, in the explorer, counts the cards due;
the header of a note shows its own. A click on either starts a review. To
review one folder, right click it in the explorer: _Review the
flashcards_. "Review the flashcards of this note" in the palette reviews
the current note.

Reviewing never changes your notes: the history of your reviews stays in
`.musubi/reviews/`, one file per computer, so syncing never conflicts. The
settings choose how many new cards a day a review brings (20 by default).

You made it to the end of the hunt. The treasure is the
#note-link("Welcome/Using_Musubi")[reference card]: the whole app on one
page, to come back to later.

And for ideas, the `Examples` folder next to these notes holds a few pages
written in Typst: a #note-link("Welcome/Examples/Character_sheet")[character
sheet], a #note-link("Welcome/Examples/Drawn_map")[drawn map] and more.

Linked from #note-link("Welcome/Writing_Typst")[Writing Typst].
