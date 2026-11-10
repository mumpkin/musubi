= Edge

#lorem(5)

#show "Wrapped": it => emph(it)
Wrapped text here.

#show heading.where(level: 2): it => [*#it.body*]
== Replaced heading

#for word in ("a", "b") [- #word]

#include "Other.typ"
