# `musubi` Typst package

Functions specific to Musubi notes: links between notes, flashcards and
tasks. A note that uses them still compiles with the Typst command-line tool,
to PDF or HTML.

```typ
#import "@local/musubi:0.1.0": card, done, note-link, todo

= Mes cours de maths

See #note-link("Maths/Analyse", section: "Intégrales")[the integrals].

#card[Derivative of $x^2$?][$2x$]

- #todo[Review chapter 3]
- #done[Read chapter 2]
```

Inside Musubi the package is always available. To compile notes outside the
app, install it as a local package:

```sh
mkdir -p ~/.local/share/typst/packages/local/musubi
ln -s "$PWD" ~/.local/share/typst/packages/local/musubi/0.1.0
typst compile --root path/to/vault path/to/vault/Maths/Mes_cours_de_maths.typ
```

## Functions

### `note-link(target, section: none, body)`

Link to another note.

| Parameter | Type      | Description                                                                                    |
| --------- | --------- | ---------------------------------------------------------------------------------------------- |
| `target`  | `str`     | Path of the note from the vault root, with `/` between folders, without `.typ` or leading `/`. |
| `section` | `str`     | Optional: text of a heading of the target note.                                                |
| `body`    | `content` | Link text.                                                                                     |

```typ
#note-link("Philo/La_poétique_d'Aristote")[La poétique d'Aristote]
#note-link("Maths/Analyse", section: "Intégrales")[the integrals]
```

A wrong target (`"Maths/Analyse.typ"`, `"/Maths/Analyse"`, `"Maths\\Analyse"`)
stops the compilation with an explicit message.

### `card(question, answer, reverse: false)`

Flashcard. With `reverse: true`, the card is reviewed in both directions
(question → answer and answer → question).

```typ
#card[What is the capital of France?][Paris]
#card(reverse: true)[chat][cat]
```

### `todo(body)` and `done(body)`

A task still to do and a task done. Usually written in a list:

```typ
- #todo[Buy milk]
- #done[Write the vault format]
```

## Output

The rendering depends on the export target, read with `target()`.

| Function    | HTML (reading view of Musubi)                                                                            | PDF and other paged outputs                  |
| ----------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `note-link` | `<a class="musubi-link" href="musubi://note/<target>#<section>" data-target data-section>`               | Underlined text                              |
| `card`      | `<div class="musubi-card" [data-reverse]>` with `musubi-card-question` and `musubi-card-answer` children | Framed `question → answer` (`↔` if reversed) |
| `todo`      | `<span class="musubi-task" data-done="false">` with a disabled checkbox                                  | Empty square                                 |
| `done`      | `<span class="musubi-task" data-done="true">` with a disabled, checked checkbox                          | Filled square                                |

## Metadata

Each function emits a `metadata` element with a label, so that Musubi builds
its index with Typst queries instead of parsing notes itself:

| Label           | Value                                                 |
| --------------- | ----------------------------------------------------- |
| `<musubi-link>` | `(target: str, section: str or none)`                 |
| `<musubi-card>` | `(question: content, answer: content, reverse: bool)` |
| `<musubi-task>` | `(body: content, done: bool)`                         |

```sh
typst eval 'query(<musubi-link>).map(element => element.value)' --in note.typ
```

## Tests

`tests/` holds test notes. For each `<name>.typ`, `<name>.expected.json` lists
the values the queries must return. `pnpm test:typst` compiles every test note
to PDF and HTML and checks the queries; the CI runs it.
