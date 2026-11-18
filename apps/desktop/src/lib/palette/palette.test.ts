// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it, vi } from 'vitest';

import { ACTION_LABELS, type ShellAction } from '../shortcuts/shortcuts.ts';
import { paletteCommands } from './palette.ts';

describe('paletteCommands', () => {
	const names = Object.keys(ACTION_LABELS) as ShellAction[];
	const actions = Object.fromEntries(
		names.map((action) => [action, vi.fn()]),
	) as unknown as Record<ShellAction, () => void>;

	it('lists every action but itself, with its shortcut, then the notes', () => {
		const open = vi.fn();
		const commands = paletteCommands(
			actions,
			[{ path: 'A.typ', title: 'A note' }],
			open,
		);
		expect(commands.some((command) => command.label === 'Show the commands'))
			.toBe(false);
		const find = commands.find((command) =>
			command.label === 'Find a note by title');
		expect(find?.shortcut).toBe('Space f');
		const note = commands.at(-1);
		expect(note?.group).toBe('Open a note');
		note?.run();
		expect(open).toHaveBeenCalledWith('A.typ');
	});
});
