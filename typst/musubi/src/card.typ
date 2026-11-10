// SPDX-License-Identifier: GPL-3.0-or-later
#import "html.typ": by-target, css-class

#let html-card(question, answer, reverse) = {
  let attributes = (class: css-class("card"))
  if reverse { attributes.insert("data-reverse", "") }
  html.elem("div", attrs: attributes, {
    html.elem("div", attrs: (class: css-class("card-question")), question)
    html.elem("div", attrs: (class: css-class("card-answer")), answer)
  })
}

#let paged-card(question, answer, reverse) = {
  let arrow = if reverse { sym.arrow.l.r } else { sym.arrow.r }
  block(
    width: 100%,
    inset: 0.6em,
    stroke: (left: 2pt + gray),
    [#question #h(0.4em) #arrow #h(0.4em) #answer],
  )
}

// Flashcard: `#card[Question][Answer]`. With `reverse: true` it is reviewed
// in both directions: `#card(reverse: true)[chat][cat]`.
#let card(question, answer, reverse: false) = {
  assert(type(reverse) == bool, message: "card: reverse must be true or false")
  [#metadata((question: question, answer: answer, reverse: reverse))<musubi-card>]
  by-target(
    () => html-card(question, answer, reverse),
    () => paged-card(question, answer, reverse),
  )
}
