#import "@local/musubi:0.1.0": card, done, note-link, todo

= Every element

== Text

Plain, *strong*, _emphasis_, `code`, #link("https://typst.app")[a web link],
a footnote#footnote[The footnote text.] and $x^2$ inline. #underline[Under],
#strike[strike], #highlight[highlight], #smallcaps[Small caps], #sub[sub] and #super[super].

/ Term: Its description.

#figure(rect(width: 2cm, height: 1cm), caption: [A figure with a rectangle.])

#rect(width: 3cm)[In a rectangle]

#circle(radius: 0.5cm)

#line(length: 3cm)

#grid(columns: 2, [a], [b], [c], [d])

#align(center)[Centred]

#box(stroke: 1pt, inset: 4pt)[Boxed]

#block(fill: luma(230), inset: 8pt)[A block]

#rotate(10deg)[Rotated]

#place(right)[Placed]

#stack(dir: ltr, [one], [two])

#columns(2)[Left #colbreak() Right]

#outline()
