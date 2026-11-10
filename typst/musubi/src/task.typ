// SPDX-License-Identifier: GPL-3.0-or-later
#import "html.typ": by-target, css-class

#let html-task(body, is-done) = {
  let checkbox-attributes = (type: "checkbox", disabled: "")
  if is-done { checkbox-attributes.insert("checked", "") }
  html.elem(
    "span",
    attrs: (class: css-class("task"), data-done: repr(is-done)),
    {
      html.elem("input", attrs: checkbox-attributes)
      body
    },
  )
}

// Drawn rather than written with a symbol: fonts render ☑ as a color emoji.
#let paged-checkbox(is-done) = {
  let mark = if is-done { box(width: 100%, height: 100%, fill: black) }
  box(
    width: 0.7em,
    height: 0.7em,
    inset: 0.12em,
    stroke: 0.6pt + black,
    baseline: 0.05em,
    mark,
  )
}

#let paged-task(body, is-done) = [#paged-checkbox(is-done) #body]

#let task(body, is-done) = {
  [#metadata((body: body, done: is-done))<musubi-task>]
  by-target(
    () => html-task(body, is-done),
    () => paged-task(body, is-done),
  )
}

// Task still to do: `- #todo[Buy milk]`.
#let todo(body) = task(body, false)

// Task done: `- #done[Buy milk]`.
#let done(body) = task(body, true)
