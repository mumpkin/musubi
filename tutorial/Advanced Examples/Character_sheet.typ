#import "@local/musubi:0.1.0": note-link

= Character sheet

// One color for the whole sheet: change it here.
#let accent = rgb("#7a3e9d")

// A small reusable box: a function returning a `box`.
#let stat(name, value) = box(
  width: 4em,
  inset: 6pt,
  radius: 6pt,
  stroke: 1.5pt + accent,
  align(center)[
    #text(size: 8pt, weight: "bold", fill: accent, upper(name)) \
    #text(size: 15pt, weight: "bold", str(value))
  ],
)

// Three columns of equal width (`1fr` each).
#grid(
  columns: (1fr, 1fr, 1fr),
  [*Class:* Ranger], [*Level:* 5], [*Origin:* Half-elf],
)

== Abilities

// `stack` puts its items side by side with `dir: ltr`.
#stack(
  dir: ltr,
  spacing: 6pt,
  stat("Str", 10), stat("Dex", 18), stat("Con", 14),
  stat("Int", 12), stat("Wis", 16), stat("Cha", 8),
)

== Special ability

// A block with a fill, a left border and rounded corners.
#block(
  fill: accent.lighten(88%),
  stroke: (left: 3pt + accent),
  inset: 10pt,
  radius: (right: 6pt),
)[
  *Hunter's mark* — once per short rest, the marked target takes 1d6
  extra damage from each hit.
]

== Inventory

#columns(2)[
  - Silk rope (15 m)
  - Torches ×3
  - Rations ×5
  #colbreak()
  - Quiver (20 arrows)
  - Elven cloak
  - 47 gold pieces
]

Back to the #note-link("Welcome/Typst_basics")[Typst basics].
