// SPDX-License-Identifier: GPL-3.0-or-later
// Show rules of the entry point of a compilation (see `entry.rs`): they
// turn what the HTML export of Typst drops into HTML or SVG. A rule only
// acts in HTML: inside an SVG island, Typst lays the content out as on a
// page, and every element keeps its own look.

// The width of the column of the reading view (`46rem` there, and an SVG
// island measures `1em` per `11pt`, the default text size).
#let musubi-column = 506pt
#let musubi-em-size = 11pt

// Lays an island out at the width of the column, so that `fr`, `%` and
// `columns` have room, but no wider than its content needs: a small shape
// keeps its size.
#let musubi-island(it, wrapper: block) = context html.frame(wrapper(
  width: measure(it, width: musubi-column).width,
  it,
))

#let musubi-is-html() = target() == "html"

// What HTML cannot show at all; inside an island, it stays as it is.
#let musubi-framed(it) = context {
  if musubi-is-html() { musubi-island(it) } else { it }
}

// A length in `em` of the reading view, from a length or the length part
// of a relative length (contextual: `em` depends on the text size).
#let musubi-em(value) = {
  let length = if type(value) == relative { value.length } else { value }
  let size = length.to-absolute() / musubi-em-size
  str(calc.round(size, digits: 3)) + "em"
}

// The value of a property for one side (`left`, `top`…) or corner
// (`top-left`…), from a single value or a dictionary of sides, axes,
// corners and `rest`.
#let musubi-side(value, keys) = {
  if type(value) != dictionary { return value }
  for key in keys {
    if key in value { return value.at(key) }
  }
  value.at("rest", default: none)
}

#let musubi-sides = (
  left: ("left", "x"),
  top: ("top", "y"),
  right: ("right", "x"),
  bottom: ("bottom", "y"),
)

// A CSS color; black, the default, follows the text of the theme.
#let musubi-color(paint) = {
  if paint == auto or paint == black { "currentColor" } else {
    paint.to-hex()
  }
}

#let musubi-border(value) = {
  if value == none or value == auto { return none }
  let line = stroke(value)
  let thickness = if line.thickness == auto { 1pt } else { line.thickness }
  let style = if line.dash in (none, auto) { "solid" } else if (
    type(line.dash) == str and line.dash.contains("dot")
  ) { "dotted" } else { "dashed" }
  (musubi-em(thickness), style, musubi-color(line.paint)).join(" ")
}

// CSS declarations for the stroke, inset and radius of `it`.
#let musubi-box-style(it) = {
  let rules = ()
  for (side, keys) in musubi-sides {
    let border = musubi-border(musubi-side(it.stroke, keys))
    if border != none { rules.push("border-" + side + ": " + border) }
    let inset = musubi-side(it.inset, keys)
    if inset not in (none, auto) {
      rules.push("padding-" + side + ": " + musubi-em(inset))
    }
  }
  let corners = ("top-left", "top-right", "bottom-right", "bottom-left")
  let radii = corners.map(corner => {
    let (vertical, horizontal) = corner.split("-")
    let radius = musubi-side(it.radius, (corner, vertical, horizontal))
    if radius in (none, auto) { "0" } else { musubi-em(radius) }
  })
  if radii.any(radius => radius != "0") {
    rules.push("border-radius: " + radii.join(" "))
  }
  if it.fill != none { rules.push("--musubi-fill: " + it.fill.to-hex()) }
  rules
}

#let musubi-has-look(it) = (
  it.fill != none
    or it.stroke not in (none, (:))
    or it.inset not in (0pt, 0% + 0pt, (:))
    or it.radius not in (0pt, 0% + 0pt, (:))
)

// A CSS size from a length, a ratio (`100%` of the column) or both.
#let musubi-size(value) = {
  if type(value) == length { return musubi-em(value) }
  let ratio = if type(value) == ratio { value } else { value.ratio }
  let length = if type(value) == ratio { 0pt } else { value.length }
  let percent = str(calc.round(ratio / 1%, digits: 3)) + "%"
  if length == 0pt { percent } else if ratio == 0% { musubi-em(length) } else {
    "calc(" + percent + " + " + musubi-em(length) + ")"
  }
}

// Whether HTML can show `it` with styles: a fill that is a plain color and
// no fraction (`1fr`). A block of a fixed height is a drawing (shapes
// placed in it): only a box, `inline`, may have a height.
#let musubi-fits-html(it, inline) = (
  (it.fill == none or type(it.fill) == color)
    and type(it.width) != fraction
    and (it.height == auto or (inline and type(it.height) != fraction))
)

#let musubi-sizes(it) = {
  let sizes = ()
  if it.width != auto { sizes.push("width: " + musubi-size(it.width)) }
  if it.height != auto { sizes.push("height: " + musubi-size(it.height)) }
  sizes
}

// A block or box with a fill, a stroke, an inset or a radius, as an HTML
// element with styles, or as an island when HTML cannot show it (a drawing
// of a fixed height, a gradient…).
#let musubi-styled(tag, inline) = it => context {
  if not musubi-is-html() or not musubi-has-look(it) { return it }
  if not musubi-fits-html(it, inline) {
    return musubi-island(it, wrapper: if inline { box } else { block })
  }
  let style = (musubi-box-style(it) + musubi-sizes(it)).join("; ")
  let body = if it.body == none { [] } else { it.body }
  html.elem(tag, attrs: (class: "musubi-box", style: style), body)
}

#let musubi-unaligned(it) = context {
  // The alignment is lost in HTML, but the content stays.
  if musubi-is-html() { it.body } else { it }
}

// Text with a color, a size, a spacing or a weight of its own. Headings,
// code and footnotes take the base size and weight first, so that only what the
// note changes shows; the reading view styles them already.
#let musubi-base(it) = context {
  if musubi-is-html() {
    set text(size: musubi-em-size, weight: "regular")
    it
  } else { it }
}

#let musubi-text-style() = {
  let rules = ()
  if type(text.fill) == color and text.fill != black {
    rules.push("--musubi-color: " + text.fill.to-hex())
  }
  let size = text.size.to-absolute()
  if size != musubi-em-size {
    let ratio = calc.round(size / musubi-em-size, digits: 3)
    rules.push("font-size: " + str(ratio) + "em")
  }
  if text.tracking != 0pt {
    rules.push("letter-spacing: " + musubi-em(text.tracking))
  }
  let weight = if type(text.weight) == int { text.weight } else {
    (thin: 100, extralight: 200, light: 300, regular: 400, medium: 500,
      semibold: 600, bold: 700, extrabold: 800, black: 900).at(text.weight)
  }
  // Equations use a weight of 450: only a clear change counts.
  if weight < 300 or weight > 500 {
    rules.push("font-weight: " + str(weight))
  }
  rules
}

#let musubi-styled-text(it) = context {
  if not musubi-is-html() { return it }
  let rules = musubi-text-style()
  if rules == () { return it }
  html.elem("span", attrs: (class: "musubi-text", style: rules.join("; ")), it)
}

// A numbered list with another numbering than `1.` (`a)`, `I.`, `1.a.`…):
// each item carries its marker, written by Typst. The numbers of the
// items around a nested list give its level, as Typst counts them.
#let musubi-parents = state("musubi-enum-parents", ())

#let musubi-quoted(marker) = {
  "\"" + marker.replace("\\", "\\\\").replace("\"", "\\\"") + " \""
}

// The marker of item `number` under `parents`: the whole chain with
// `full`, else only the counting symbol of its level.
#let musubi-marker(it, parents, number) = {
  let marker = numbering(it.numbering, ..parents, number)
  if type(marker) != str { return none }
  if it.full or parents == () { return musubi-quoted(marker) }
  let prefix = numbering(it.numbering, ..parents)
  if type(prefix) == str and marker.starts-with(prefix) {
    marker = marker.slice(prefix.len())
  }
  musubi-quoted(marker)
}

#let musubi-numbered(it) = context {
  if not musubi-is-html() or it.numbering == "1." { return it }
  let parents = musubi-parents.get()
  let step = if it.reversed { -1 } else { 1 }
  let number = if it.start != auto { it.start } else if it.reversed {
    it.children.len()
  } else { 1 }
  let items = ()
  for item in it.children {
    let explicit = item.at("number", default: auto)
    if explicit != auto { number = explicit }
    let marker = musubi-marker(it, parents, number)
    if marker == none { return it }
    let body = {
      musubi-parents.update(parents + (number,))
      item.body
      musubi-parents.update(parents)
    }
    let style = "list-style-type: " + marker
    items.push(html.elem("li", attrs: (style: style), body))
    number += step
  }
  html.elem("ol", attrs: (class: "musubi-enum"), items.join())
}
