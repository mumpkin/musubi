#import "@local/musubi:0.1.0": card, done, note-link, todo

= Demo note

This note shows what the reading view renders: *strong*, _emphasis_,
`inline code`, and inline math such as $e^(i pi) + 1 = 0$ in the middle of a
sentence.

== Lists

- A bullet list
  - with a nested item
  - and another one
- Back to the first level

+ A numbered list
+ Second item

== Code

```rust
fn main() {
    println!("Hello, Musubi!");
}
```

== Math

The Gaussian integral:

$ integral_(-oo)^(+oo) e^(-x^2) dif x = sqrt(pi) $

== Links

See #note-link("Maths/Analyse")[Analyse], its section on
#note-link("Maths/Analyse", section: "Intégrales")[integrals], and
#note-link("Philo/La_poétique_d'Aristote")[La poétique d'Aristote]. This one
points to a #note-link("Missing_note")[note that does not exist yet].

== Cards

#card[What is the capital of France?][Paris]

#card(reverse: true)[chat][cat]

#card[Derivative of $x^2$?][$2x$]

== Tasks

- #todo[Write the reading view]
- #done[Compile a note to HTML]

== Quote and table

#quote(block: true)[Simple things should be simple.]

#table(
  columns: 2,
  [*Key*], [*Action*],
  [`j` / `k`], [Next / previous block],
  [`e`], [Edit],
)
