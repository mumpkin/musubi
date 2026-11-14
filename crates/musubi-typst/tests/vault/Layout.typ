= Relative sizes

#grid(
  columns: (1fr, 2.6fr),
  column-gutter: 14pt,
  [Cue], [A long answer that should wrap over the wide right column only.],
)

#grid(
  columns: (1fr, 1fr, 1fr),
  [Left header], [Centre header], [Right header],
)

#columns(2)[First column #colbreak() Second column]

#rect(width: 100%)[A full-width rectangle]

#circle(radius: 0.5cm)
