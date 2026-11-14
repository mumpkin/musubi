#import "@local/musubi:0.1.0": note-link

= A class diagram

// A UML class: its name, a line, then its fields. Every class has the
// same size, so that arrows can meet the middle of its sides.
#let class(name, ..fields) = rect(width: 110pt, height: 70pt, inset: 0pt,
  stack(
    block(width: 100%, inset: 5pt, align(center, strong(name))),
    line(length: 100%),
    block(inset: 5pt, text(size: 9pt, fields.pos().join(linebreak()))),
  ),
)

// The tips of the arrows, drawn pointing right, at the origin.
#let diamond = polygon(
  (0pt, 0pt), (6pt, -4pt), (12pt, 0pt), (6pt, 4pt), fill: black,
)
#let open-tip = polygon((0pt, 0pt), (-8pt, -4pt), (-8pt, 4pt), stroke: 1pt)

// A line from `start` to `end`, both `(x, y)`, with a diamond at the
// start (the whole is made of the parts) or an open tip at the end.
#let relation(start, end, label, kind: "composition") = {
  let (x1, y1) = start
  let (x2, y2) = end
  place(line(start: start, end: end))
  // Turn the tip towards the direction of the line.
  let angle = calc.atan2((x2 - x1) / 1pt, (y2 - y1) / 1pt)
  let (x, y, tip) = if kind == "composition" { (x1, y1, diamond) } else {
    (x2, y2, open-tip)
  }
  place(dx: x, dy: y, rotate(angle, origin: top + left, reflow: false, tip))
  place(dx: (x1 + x2) / 2 + 5pt, dy: (y1 + y2) / 2 - 12pt,
    text(size: 8pt, style: "italic", label))
}

// The diagram: classes placed in a block of a fixed height, then the
// lines between the middles of their sides.
#block(width: 100%, height: 190pt)[
  #place(dx: 0pt, dy: 0pt, class("Vault", "root: Path", "notes()"))
  #place(dx: 180pt, dy: 0pt, class("Folder", "name: String", "children()"))
  #place(dx: 180pt, dy: 115pt,
    class("Note", "title: String", "links: [Note]", "render()"))
  #place(dx: 360pt, dy: 115pt, class("Card", "question", "answer"))
  #relation((110pt, 35pt), (180pt, 35pt), [has])
  #relation((235pt, 70pt), (235pt, 115pt), [holds])
  #relation((290pt, 150pt), (360pt, 150pt), [asks], kind: "association")
]

// A legend, in a grid with an `auto` column.
#grid(
  columns: (auto, 1fr),
  gutter: 8pt,
  [◆], [is made of (composition)],
  [▷], [uses (association)],
)

Back to the #note-link("Welcome/Typst_basics")[Typst basics].
