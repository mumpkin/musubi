// SPDX-License-Identifier: GPL-3.0-or-later
#import "html.typ": by-target, css-class

#let note-extension = ".typ"

#let check-target(target) = {
  assert(type(target) == str, message: "note-link: the target must be a string")
  assert(target != "", message: "note-link: the target must not be empty")
  assert(
    not target.ends-with(note-extension),
    message: "note-link: write the target without `.typ`: " + target,
  )
  assert(
    not target.starts-with("/"),
    message: "note-link: the target is relative to the vault root, without a leading `/`: "
      + target,
  )
  assert(
    not target.contains("\\"),
    message: "note-link: use `/` to separate folders: " + target,
  )
}

#let link-url(target, section) = {
  let url = "musubi://note/" + target
  if section == none { url } else { url + "#" + section }
}

// Link to another note, by its path from the vault root without extension:
// `#note-link("Philo/La_poétique_d'Aristote")[La poétique d'Aristote]`.
// `section` targets a heading of that note, by its text.
#let note-link(target, section: none, body) = {
  check-target(target)
  assert(
    section == none or type(section) == str,
    message: "note-link: the section must be a string",
  )
  [#metadata((target: target, section: section))<musubi-link>]
  by-target(
    () => {
      let attributes = (
        href: link-url(target, section),
        class: css-class("link"),
        data-target: target,
      )
      if section != none { attributes.insert("data-section", section) }
      html.elem("a", attrs: attributes, body)
    },
    () => underline(body),
  )
}
