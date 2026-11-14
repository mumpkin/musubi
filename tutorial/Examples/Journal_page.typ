#import "@local/musubi:0.1.0": note-link

= Journal — A walk by the sea

// Every section heading gets a soft background.
#show heading.where(level: 2): it => block(
  fill: rgb("#fff3d6"),
  inset: 6pt,
  radius: 3pt,
  width: 100%,
  it,
)

== Morning

Left #text(fill: rgb("#1d6fa5"))[early], under a #text(size: 13pt)[huge]
sky. #highlight[Low tide] at nine: the rocks were full of crabs.

#quote(block: true, attribution: [A fisherman])[
  The sea gives back what you leave to it.
]

== Afternoon

// Another numbering for this list: a), b), c)…
#set enum(numbering: "a)")
+ Lunch on the dunes
+ The lighthouse, 214 steps
+ Back before the rain

Back to the #note-link("Welcome/Typst_basics")[Typst basics].
