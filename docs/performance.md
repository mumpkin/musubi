# Performance

How fast Musubi is on large vaults, what it should achieve, and how to
measure it.

## Measuring

```sh
cargo run --release -p musubi-core --example bench              # 100, 1,000, 5,000 notes
cargo run --release -p musubi-core --example bench -- 2000      # other sizes
cargo run --release -p musubi-core --example bench -- --write /tmp/big 2000
```

The benchmark (`crates/musubi-core/examples/bench/`) generates a
reproducible vault: nested folders (about 40 notes each, up to 3 levels),
notes of a few paragraphs with headings, formulas, flashcards and 0 to 5
links, most of them to a note of the same folder, a few notes being linked
far more than the others. It then times what
the app asks of the core, in the order of the Tauri commands. `--write`
only writes a vault, to open in the app and test the interface by hand.

## Budget

| Kind of operation                                    | Budget                                         |
| ---------------------------------------------------- | ---------------------------------------------- |
| Per keystroke (search pickers)                       | 16 ms                                          |
| After an action (save, open a note, refresh a panel) | 50 ms                                          |
| Opening a vault already indexed                      | 500 ms                                         |
| First opening of a vault (indexing every note)       | progress shown, window responsive              |
| Graph view                                           | 60 frames per second while panning and zooming |

The budget holds up to 5,000 notes.

## Results (2026-11-16)

Release build, Linux, warm disk cache, averages in milliseconds.

| Operation                         | 100 notes | 1,000 notes | 5,000 notes |
| --------------------------------- | --------: | ----------: | ----------: |
| Open: index every note (cold)     |       147 |       1,565 |      12,851 |
| Refresh with nothing changed      |       1.3 |        12.4 |        62.7 |
| `vault_tree` (refresh + tree)     |       2.3 |        23.2 |       117.0 |
| `search_notes`, one keystroke     |       1.1 |        11.2 |        56.5 |
| `search_text`                     |       0.4 |         1.5 |         5.6 |
| Backlinks of the most linked note |       0.0 |         0.0 |         0.0 |
| `vault_graph`                     |       0.1 |         1.0 |         5.6 |
| `write_note` (save + refresh)     |       2.5 |        14.4 |        68.4 |
| `render_note`, next compilations  |       0.3 |         0.3 |         0.4 |

Over budget at 5,000 notes: `search_notes` (×3.5), `vault_tree` (×2.3),
`write_note` (×1.4) and the first opening (13 s with the window waiting).

## Findings

- `Vault::tree` reads and parses **every note** to get its title. It runs on
  every refresh, on every keystroke of the note picker, and twice per
  `vault_tree` (once inside the refresh). Titles are already in the index:
  the tree and the picker can take them from there, and the refresh can
  compare file times without reading the files.
- Every command that changes a file refreshes the whole vault, while it
  knows which files it touched.
- The first indexing compiles notes one by one while holding the lock of the
  open vault, so the interface waits for it.
- `render_note` and `toggle_task` also hold that lock during a compilation:
  a slow note delays search and backlinks.
- Search, backlinks, the graph data and compilation itself are fast.

## Graph view (2026-11-17)

Measured in the app window on 2,000 generated notes (about 3,000 links),
before and after #199.

| Measure                                    | Before |  After |
| ------------------------------------------ | -----: | -----: |
| First layout, grouped by folder            |  9.3 s |  2.6 s |
| First layout, dots                         |      — |  2.2 s |
| Mean move of every note after a click      |  1,128 |      0 |
| Mean move of notes far from a dragged note |     73 |   0.02 |
| Frame while zooming, 95th percentile       |  20 ms |  17 ms |
| Folder grouping force, per step            |  13 ms | 0.6 ms |
| Whole simulation step, grouped             |  12 ms |   7 ms |

Pills are slower to lay out (7 s for 2,000 notes) and a few still touch on
crowded graphs: past a few hundred notes, dots read better.
