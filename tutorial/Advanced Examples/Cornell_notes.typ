#import "@local/musubi:0.1.0": note-link

= Cornell notes — Thermodynamics

// Cues in color and bold, through a small function.
#let cue(body) = text(fill: rgb("#1d6fa5"), weight: "bold", body)

// Two columns: cues on the left, notes on the right, 2.6 times wider.
// The stroke function draws a line on the right of the first column.
#grid(
  columns: (1fr, 2.6fr),
  column-gutter: 14pt,
  row-gutter: 12pt,
  stroke: (x, y) => if x == 0 { (right: 1pt + gray) },
  inset: (x: 6pt, y: 4pt),
  cue[First law?],
  [Energy is conserved: $Delta U = Q + W$. Work and heat are two ways of
    transferring it.],
  cue[Entropy],
  [A measure of disorder; for a reversible change
    $ d S = (delta Q_"rev") / T $],
  cue[Carnot efficiency],
  [$ eta = 1 - T_"cold" / T_"hot" $ never reached in practice.],
)

// A rectangle as wide as the page, with a light fill.
#rect(width: 100%, fill: luma(245), inset: 10pt, radius: 4pt)[
  *Summary* — energy is conserved but degrades: the entropy of an isolated
  system can only grow, which limits the efficiency of heat engines.
]

Back to the #note-link("Welcome/Typst_basics")[Typst basics].
