#import "@local/musubi:0.1.0": note-link

= Typst basics

A note is a #link("https://typst.app/docs")[Typst] file. Most of it is plain
text with a little markup. Press `i` to see how this note is written: the
source is the best example.

== Headings

The first line with one `=` is the *title* of the note; it also names its
file. `==` starts a section, `===` a subsection.

== Text

- `*strong*` gives *strong*, `_emphasis_` gives _emphasis_.
- Backticks give `inline code`.
- An empty line starts a new paragraph; a `\` at the end of a line breaks
  it.
- Web links: `#link("https://typst.app")[Typst]` gives
  #link("https://typst.app")[Typst], which opens in your browser.
- A footnote: `#footnote[…]`#footnote[Footnotes go to the end of the note.].

== Lists

- A line starting with `-` is a bullet.
  - Indent it to nest it.
+ A line starting with `+` is numbered.
+ Numbers follow by themselves.

/ Term: A line starting with `/` and ending the term with `:` describes a
  term.

== Math

Between dollars in a sentence: $a^2 + b^2 = c^2$. With spaces inside the
dollars, on its own:

$ sum_(k=1)^n k = (n(n+1)) / 2 $

== Code

Three backticks and the name of a language:

```python
def greet(name):
    return f"Hello, {name}!"
```

== Images

Paste an image (`Ctrl-v`) or drop one on the editor: Musubi copies it next
to the note and writes the call for you. The image below is in the
`Typst_basics.assets` folder:

#image("Typst_basics.assets/musubi.svg", width: 3cm)

== Tables and quotes

#table(
  columns: 2,
  [*Write*], [*To get*],
  [`*strong*`], [*strong*],
  [`_emphasis_`], [_emphasis_],
  [`$x^2$`], [$x^2$],
)

#quote(block: true)[A quote, with `#quote(block: true)[…]`.]

== Going further

Everything else Typst can do works too: functions, variables, shapes,
grids. What the reading view cannot show as text is drawn as an image. The
#link("https://typst.app/docs/tutorial/")[Typst tutorial] explains it all.

Back to #note-link("Welcome/Writing_Typst")[Writing Typst].
