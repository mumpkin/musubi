#import "@local/musubi:0.1.0": todo, done
#import "@local/musubi:0.1.0" as mu

= Tasks

- #todo[Buy *milk*]
- #done[Call #link("https://x.y")[Bob]]
- #mu.todo[Field]

#let t(body) = todo(body)
- #t[Wrapped]
