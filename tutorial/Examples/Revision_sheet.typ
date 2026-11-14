#import "@local/musubi:0.1.0": card, note-link

= Revision sheet — Linear algebra

// Number the equations on their own line: (1), (2)…
#set math.equation(numbering: "(1)")

// A theorem box, reusable for every theorem of the sheet.
#let theorem(title, body) = block(
  width: 100%,
  inset: 10pt,
  radius: 4pt,
  fill: rgb("#e8f4ea"),
  stroke: 1pt + rgb("#3a8a4e"),
)[*Theorem (#title).* #body]

#theorem("Rank–nullity")[
  For a linear map $f: E -> F$ with $dim E < oo$:
  $ dim E = dim ker f + "rk" f $ <rank>
]

By @rank, the kernel is trivial if and only if $f$ is injective.

$ A = mat(1, 2; 3, 4), quad det A = 1 dot 4 - 2 dot 3 = -2 $

$ |x| = cases(x & "if" x >= 0, -x & "otherwise") $

// A flashcard, reviewed with `Space c`.
#card[What does the rank–nullity theorem say?][
  $dim E = dim ker f + "rk" f$
]

Back to the #note-link("Welcome/Typst_basics")[Typst basics].
