// SPDX-License-Identifier: GPL-3.0-or-later
// Commands of the palette: the shell actions, then the notes to open.
import type { NoteEntry } from '../bindings/NoteEntry.ts';
import type { PaletteCommand } from './actions.ts';
import { ACTION_LABELS, type ShellAction, shortcutLabel } from './shortcuts.ts';

export function paletteCommands(
	actions: Record<ShellAction, () => void>,
	notes: NoteEntry[],
	open: (path: string) => void,
): PaletteCommand[] {
	const actionCommands = Object.entries(ACTION_LABELS)
		.filter(([action]) => action !== 'palette')
		.map(([action, { label, group }]) => ({
			label,
			group,
			shortcut: shortcutLabel(action as ShellAction),
			run: actions[action as ShellAction],
		}));
	const noteCommands = notes.map((note) => ({
		label: note.title,
		group: 'Open a note',
		run: () => {
			open(note.path);
		},
	}));
	return [...actionCommands, ...noteCommands];
}
