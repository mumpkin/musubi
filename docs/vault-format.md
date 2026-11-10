# Vault format

**Format version: 0** (draft, may still change before the first release).

A vault is a plain folder. Its files are the only source of truth: everything
Musubi shows can be rebuilt from them. Users sync a vault with the tool of
their choice (Syncthing, Nextcloud, git…); Musubi never syncs anything itself.

This document is the contract between Musubi and the files on disk. Any change
to it follows the [versioning policy](#versioning-and-migration).

## Overview

```
My_vault/
├── .musubi/
│   ├── vault.json
│   ├── trash/
│   │   └── 20261110T140322Z-3fa9c1d2/
│   │       ├── entry.json
│   │       └── Maths/
│   │           ├── Old_note.typ
│   │           └── Old_note.assets/
│   └── reviews/
│       └── 7c1e9a40b2d35f18.jsonl
├── Maths/
│   ├── Mes_cours_de_maths.typ
│   └── Mes_cours_de_maths.assets/
│       └── triangle.png
└── Philo/
    └── La_poétique_d'Aristote.typ
```

## Notes

- A note is a file with the `.typ` extension, anywhere in the vault except
  inside `.musubi/` and `*.assets/` folders.
- Notes are UTF-8 Typst source files. Musubi writes them with `\n` line
  endings and keeps the line endings of files it did not create.
- The **vault root is the Typst project root**: a path starting with `/` in a
  note (`image("/Maths/figure.png")`) is relative to the vault root.
- Notes that use Musubi functions (links, cards, tasks) import the `musubi`
  Typst package, described in
  [`typst/musubi/README.md`](../typst/musubi/README.md). A note always stays
  compilable with the Typst command-line tool.
- Other files are kept as they are but are not shown as notes.
- Files and folders whose name starts with `.` are ignored, except
  `.musubi/`.

### Title

The title of a note is the **text of its first level-1 heading** at the top
level of the file, with markup removed. If there is none, the title is the
file name without its extension, with `_` replaced by spaces.

| Source                                           | Title                     |
| ------------------------------------------------ | ------------------------- |
| `= Mes cours de maths`                           | Mes cours de maths        |
| `= Les *intégrales* de Riemann`                  | Les intégrales de Riemann |
| `#set page(..)` then `= Algèbre`                 | Algèbre                   |
| `== Section` then `= Titre`                      | Titre                     |
| no level-1 heading, file `Brouillon_du_jour.typ` | Brouillon du jour         |

Inline math keeps its source text without the `$` delimiters
(`= L'équation $x^2$` → `L'équation x^2`). A heading produced by a function
call or a `show` rule is not taken into account.

## File names

Musubi derives a file name from the title when it **creates a note** and when
the **title changes** inside Musubi. It never renames a file just because it
was opened: names given outside Musubi are kept until the title is edited.

The same rules apply to folders created in Musubi (without the extension).

### Naming algorithm

From the title to the file stem (the name without `.typ`):

1. **Normalize** the title to Unicode NFC.
2. **Remove** the characters that are forbidden on Windows or in paths:
   `< > : " / \ | ? *` and control characters (U+0000 to U+001F, U+007F).
3. **Replace** every run of whitespace characters (Unicode `White_Space`)
   with a single `_`.
4. **Collapse** every run of several `_` into a single `_`.
5. **Trim** `_` and `.` at both ends (a leading `.` would hide the file, a
   trailing `.` is forbidden on Windows).
6. If the result is **empty**, use `Untitled`.
7. If the result is a **Windows reserved name** (`CON`, `PRN`, `AUX`, `NUL`,
   `COM1` to `COM9`, `LPT1` to `LPT9`, compared case-insensitively), append
   `_`.
8. **Truncate** to 200 bytes of UTF-8, at a character boundary, then trim
   trailing `_` and `.` again. This leaves room for the `.assets` folder and
   collision suffixes within the 255-byte limit of common file systems.
9. **Resolve collisions** (see below).

Case and accents are kept. Apostrophes, hyphens, digits, `#`, `%`, `&`, `+`,
emoji and every other character are kept.

### Collisions

A stem collides when, in the same folder, a note `<stem>.typ` or a folder
`<stem>.assets` already exists. The comparison is **case-insensitive** (NFC
then Unicode lowercase), because the vault may be synced to a case-insensitive
file system. The note being renamed never collides with itself.

On collision, append `_2`, then `_3`, and so on, until the stem is free.

Notes with the same name in **different folders** do not collide.

### Examples

| Title                            | Existing files in the folder     | File name                    |
| -------------------------------- | -------------------------------- | ---------------------------- |
| `Mes cours de maths`             |                                  | `Mes_cours_de_maths.typ`     |
| `  Mes   cours  `                |                                  | `Mes_cours.typ`              |
| `La poétique d'Aristote`         |                                  | `La_poétique_d'Aristote.typ` |
| `Cafe` + U+0301 (decomposed `é`) |                                  | `Café.typ` (NFC)             |
| `Café ou thé ?`                  |                                  | `Café_ou_thé.typ`            |
| `C++ : les pointeurs`            |                                  | `C++_les_pointeurs.typ`      |
| `2026/11/10 Réunion`             |                                  | `20261110_Réunion.typ`       |
| `"Citation"`                     |                                  | `Citation.typ`               |
| `snake_case _ note`              |                                  | `snake_case_note.typ`        |
| `Ligne 1` + tab + `Ligne 2`      |                                  | `Ligne_1_Ligne_2.typ`        |
| `.config`                        |                                  | `config.typ`                 |
| `Fin.`                           |                                  | `Fin.typ`                    |
| `...`                            |                                  | `Untitled.typ`               |
| `???`                            |                                  | `Untitled.typ`               |
| `Nul`                            |                                  | `Nul_.typ`                   |
| `com1`                           |                                  | `com1_.typ`                  |
| `🎉 Fête`                        |                                  | `🎉_Fête.typ`                |
| `Mes cours de maths`             | `Mes_cours_de_maths.typ`         | `Mes_cours_de_maths_2.typ`   |
| `Mes cours de maths`             | `mes_cours_de_maths.typ`         | `Mes_cours_de_maths_2.typ`   |
| `Mes cours de maths`             | `Mes_cours_de_maths.assets/`     | `Mes_cours_de_maths_2.typ`   |
| `Exercice 2`                     | `Exercice_2.typ`                 | `Exercice_2_2.typ`           |
| `Untitled`                       | `Untitled.typ`, `Untitled_2.typ` | `Untitled_3.typ`             |
| 300 × `a`                        |                                  | 200 × `a` + `.typ`           |

### Renaming

When the title of a note changes, Musubi:

1. computes the new stem with the algorithm above;
2. renames `<old>.typ` and, if it exists, `<old>.assets/` to the new stem;
3. rewrites the paths that point to them in every note: `note-link` targets
   and image paths.

If only the case of the title changes (`maths` → `Maths`), the file is
renamed too, through a temporary name so that it works on case-insensitive
file systems.

## Images and attachments

- Files inserted into a note (drag and drop, paste, snippet) are **copied**
  into a folder named `<stem>.assets/` next to the note. The original file
  is never moved.
- The `.assets/` folder belongs to its note: it is renamed, moved and sent to
  the trash with it. It is hidden in the file explorer.
- A note refers to its own files with a path **relative to the note**:
  `image("Mes_cours_de_maths.assets/triangle.png")`. A note may also use a
  file of another note, by a relative or a root path; renaming rewrites both.
- **File name**: the original name, with the stem cleaned by the naming
  algorithm (steps 1 to 8) and the extension lowercased:
  `Capture d’écran 2026.PNG` → `Capture_d’écran_2026.png`. Pasted data
  without a name is named `image_<YYYYMMDD>_<HHMMSS>.<ext>` in local time:
  `image_20261110_140322.png`.
- **Duplicates**: if a file with the same content (same SHA-256) already
  exists in the note's `.assets/` folder, Musubi reuses it instead of
  copying it again.
- **Collisions**: if the name is taken by a file with different content, the
  collision suffix applies to the stem: `triangle.png` → `triangle_2.png`.

## The `.musubi/` folder

Created by Musubi when a folder is opened as a vault. It is meant to be
synced with the notes.

### `vault.json`

```json
{
	"format": 0,
	"trashRetentionDays": 30
}
```

| Field                | Type    | Default | Meaning                                                   |
| -------------------- | ------- | ------- | --------------------------------------------------------- |
| `format`             | integer | `0`     | Vault format version.                                     |
| `trashRetentionDays` | integer | `30`    | Days before trash entries are purged; `0` disables purge. |

Unknown fields are kept when Musubi rewrites the file. A missing file means
format `0` with default values.

### Trash

Deleting a note moves it to the trash instead of removing it.

- Each deletion creates one **entry**, a folder in `.musubi/trash/` named
  `<deletion time, UTC, YYYYMMDDTHHMMSSZ>-<8 random hex digits>`, for example
  `20261110T140322Z-3fa9c1d2`. The random part avoids clashes between devices.
- The entry contains the deleted files at their **original path** relative to
  the vault root, with their `.assets/` folder, and an `entry.json`:

    ```json
    {
    	"originalPath": "Maths/Old_note.typ",
    	"deletedAt": "2026-11-10T14:03:22Z"
    }
    ```

- **Restoring** moves the files back to `originalPath`. If that path is taken,
  the collision suffix applies (`Old_note_2.typ`). Missing parent folders are
  created.
- **Purge**: when a vault is opened, entries older than `trashRetentionDays`
  (by `deletedAt`) are removed. The user can also empty the trash by hand.
- Trashed notes are not indexed: links to them show as links to missing
  notes.
- Two devices purging the same entry both remove the same folder, which sync
  tools handle without conflict.

### Flashcard review log

Review history lives **outside the notes**, so that reviewing never modifies
a note and never causes a sync conflict.

- Each device writes **only its own file**, `.musubi/reviews/<device-id>.jsonl`,
  where the device id is 16 random hex digits generated once per installation
  and stored in the app's local data. Files are never edited by two devices,
  so sync tools never see conflicting changes.
- The file is **append-only**, in [JSON Lines](https://jsonlines.org/): one
  review per line.

    ```json
    {
    	"card": "9f2c4e1a7b3d5f60:forward",
    	"reviewedAt": "2026-11-10T14:03:22Z",
    	"rating": 3
    }
    ```

    | Field        | Meaning                                                 |
    | ------------ | ------------------------------------------------------- |
    | `card`       | Card key (below).                                       |
    | `reviewedAt` | Review time, UTC, RFC 3339.                             |
    | `rating`     | `1` again, `2` hard, `3` good, `4` easy (FSRS ratings). |

- The **card key** is the first 16 hex digits of the SHA-256 of the
  question's Typst source (NFC, leading and trailing whitespace trimmed),
  followed by `:forward` or `:reverse`. It does not depend on the note path,
  so moving or renaming a note keeps the history. Editing a question starts a
  new history; two identical questions share one.
- The state of a card is computed by replaying, in `reviewedAt` order, the
  reviews of all device files. The result is the same on every device.

## What is never in the vault

Everything that can be rebuilt or that only concerns one device lives in the
application's local data directory (`~/.local/share/io.github.mumpkin.musubi/`
on Linux), never in the vault:

- the search index and link index (SQLite);
- compilation caches and rendered HTML;
- interface state: open panes, scroll positions, panel sizes;
- the device id and device settings.

Deleting this directory loses nothing: Musubi rebuilds it from the vault.

## Sync conflict files

When two devices change the same file before syncing, sync tools keep both
versions under different names. Musubi recognises these copies, does not show
them as separate notes, flags the original note, and offers a side-by-side
comparison. Once resolved, the merged content is written to the original and
the copy goes to the trash.

| Tool                | Conflict copy of `Note.typ`                                   |
| ------------------- | ------------------------------------------------------------- |
| Syncthing           | `Note.sync-conflict-20261110-140322-ABCDEFG.typ`              |
| Nextcloud, ownCloud | `Note (conflicted copy 2026-11-10 140322).typ`                |
| Dropbox             | `Note (Alice's conflicted copy 2026-11-10).typ`               |
| Seafile             | `Note (SFConflict alice@example.org 2026-11-10-14-03-22).typ` |

Patterns, applied to the file name (`<stem>` is the original stem):

| Tool                | Pattern                                                    |
| ------------------- | ---------------------------------------------------------- |
| Syncthing           | `<stem>.sync-conflict-<8 digits>-<6 digits>-<7 chars>.typ` |
| Nextcloud, ownCloud | `<stem> (conflicted copy <anything>).typ`                  |
| Dropbox             | `<stem> (<anything>conflicted copy<anything>).typ`         |
| Seafile             | `<stem> (SFConflict <anything>).typ`                       |

**git** does not create copies: a failed merge leaves conflict markers in the
file. Musubi flags a note containing a line that starts with `<<<<<<< ` and a
later line that starts with `>>>>>>> `, and offers the same comparison.

Conflict copies of `.musubi/vault.json` are resolved by keeping the original.
Trash entries and review logs are designed not to conflict.

## Versioning and migration

- `format` in `vault.json` is an integer, incremented on every change that an
  older Musubi would misread. Adding an optional field that older versions
  can ignore does not change it.
- Musubi opens vaults whose format is lower than or equal to the one it
  supports. A vault with a **higher** format opens **read-only**, with a
  message asking to update Musubi.
- Migrating a vault to a newer format happens only after the user confirms,
  and is described in the changelog. Migrations are one-way.
- Before the first stable release, format `0` may still change without
  migration; changes are listed in the changelog.
