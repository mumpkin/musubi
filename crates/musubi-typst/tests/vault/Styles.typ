= Styled blocks

#block(
  fill: luma(240),
  stroke: (left: 3pt + purple),
  inset: 10pt,
  radius: 6pt,
)[A highlighted *ability*.]

A #box(fill: red.lighten(80%), inset: (x: 6pt, y: 3pt), radius: 10pt)[pill]
and an empty #box(width: 10pt, height: 10pt, stroke: 1pt) box.

#block(width: 100%, height: 50pt, fill: yellow)[
  #place(dx: 10pt, dy: 10pt)[A drawing]
]

#block(fill: gradient.linear(red, blue), inset: 4pt)[A gradient]

#block(height: 30pt)[#place(dx: 20pt)[A drawing without a fill]]

#block[A block without a look]

#show heading.where(level: 3): it => block(
  fill: luma(240), inset: 6pt, width: 100%, it,
)

=== A heading in a full-width block
