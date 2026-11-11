# Color themes

A theme sets the colors of the interface, of the editor and of the reading
view. Musubi ships **GitHub Light** and **GitHub Dark**; without a choice,
it follows the light or dark preference of the system. Themes are a setting
of the device: they are not stored in the vault.

## Choosing and importing

The settings (`Space ,`) list the themes, with buttons to import and remove.
The command palette (`Space ?`) has the same commands, in the _Theme_
group: _Follow the system theme_, _Use the theme …_, _Import a theme_ and
_Remove the theme …_ for imported themes. The choice applies at once and is
saved in the settings of the device.

_Import a theme_ asks for a JSON file. Musubi checks it and copies it into
the `themes/` folder of its config directory
(`~/.config/io.github.mumpkin.musubi/themes/` on Linux), named from the theme
name. Removing the chosen theme brings back the system theme.

## File format

```json
{
	"name": "Solarized Light",
	"colorScheme": "light",
	"credit": "Optional: where the colors come from",
	"ui": {
		"background": "#fdf6e3",
		"foreground": "#586e75",
		"accent": "#268bd2"
	},
	"syntax": {
		"keyword": "#859900",
		"string": "#2aa198"
	}
}
```

| Field         | Type   | Meaning                                |
| ------------- | ------ | -------------------------------------- |
| `name`        | string | Name shown in the palette. Required.   |
| `colorScheme` | string | `light` or `dark`. Required.           |
| `credit`      | string | Optional credit or licence.            |
| `ui`          | object | Interface colors, by name (see below). |
| `syntax`      | object | Syntax colors, by token (see below).   |

Colors are hex colors: `#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa`. Any other
value refuses the file. A missing color comes from the default theme of the
same scheme, GitHub Light or GitHub Dark; unknown fields are ignored.

### Interface colors (`ui`)

| Name         | Used for                                         |
| ------------ | ------------------------------------------------ |
| `background` | Panes and the editor.                            |
| `foreground` | Text, math, and shapes drawn by Typst in black.  |
| `muted`      | Secondary text: labels, line numbers, captions.  |
| `surface`    | Side panels, code blocks, table headers.         |
| `border`     | Lines between panels, tables.                    |
| `accent`     | Links, focus, the current note in the graph.     |
| `selection`  | Selected text, the current note in the explorer. |
| `hover`      | Entries under the pointer or the keyboard focus. |
| `error`      | Errors.                                          |
| `warning`    | Warnings, jump labels of the editor.             |
| `mark`       | Background of highlighted text (`#highlight`).   |

### Syntax colors (`syntax`)

The editor and the code blocks of the reading view use the same tokens.
Typst colors code blocks with its own palette; Musubi replaces each color
of that palette with the token below.

| Token      | Examples                                       |
| ---------- | ---------------------------------------------- |
| `comment`  | Comments.                                      |
| `keyword`  | `#let`, `#import`, `fn`, `true`, `none`.       |
| `string`   | Strings; the `$` of math in the editor.        |
| `constant` | Numbers and constants.                         |
| `function` | Function names.                                |
| `macro`    | Macros (`println!`).                           |
| `escape`   | Escapes, labels and references.                |
| `special`  | List markers, interpolations, named arguments. |
| `raw`      | Raw text in Typst markup.                      |

Colors that a note sets itself (`#text(fill: red)`) stay as they are.

## Credits

The default themes take their colors from GitHub Light Default and GitHub
Dark Default of
[primer/github-vscode-theme](https://github.com/primer/github-vscode-theme)
(`@primer/primitives` 7.10.0), MIT licence, © 2020 Primer. The licence is in
[`apps/desktop/src/lib/theme/LICENSE-github-vscode-theme`](../apps/desktop/src/lib/theme/LICENSE-github-vscode-theme).
