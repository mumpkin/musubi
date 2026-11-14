#import "@local/musubi:0.1.0": note-link

= A small drawn map

// A place on the map: a dot and its name, put at `x`, `y` with `place`.
#let spot(name, x, y, color) = place(
  top + left,
  dx: x,
  dy: y,
  stack(dir: ltr, spacing: 3pt,
    circle(radius: 4pt, fill: color),
    text(size: 9pt, weight: "bold", name),
  ),
)

// The map: a block of a fixed height, with shapes placed in it.
#block(width: 100%, height: 200pt, fill: rgb("#e9dfc7"), radius: 8pt)[
  #place(top + left, dx: 40pt, dy: 30pt,
    ellipse(width: 150pt, height: 80pt, fill: rgb("#a7c49a")))
  #place(top + left, dx: 230pt, dy: 70pt,
    ellipse(width: 120pt, height: 100pt, fill: rgb("#9cb6c9")))
  #place(top + left, dx: 60pt, dy: 150pt,
    line(start: (0pt, 0pt), end: (200pt, 30pt),
      stroke: (paint: rgb("#6b4f2a"), thickness: 2pt, dash: "dashed")))
  #spot("Silver Port", 70pt, 60pt, red)
  #spot("Frozen Lake", 260pt, 110pt, blue)
  #spot("Old Tower", 170pt, 160pt, black)
]

// The legend: a grid with an `auto` column for the dots.
#grid(
  columns: (auto, 1fr),
  gutter: 8pt,
  circle(radius: 4pt, fill: red), [Town],
  circle(radius: 4pt, fill: blue), [Nature],
  circle(radius: 4pt, fill: black), [Ruin],
)

Back to the #note-link("Welcome/Typst_basics")[Typst basics].
