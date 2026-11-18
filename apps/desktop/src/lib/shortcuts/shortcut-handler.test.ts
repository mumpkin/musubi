// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import { shortcutHandler } from './shortcut-handler.ts';
import type { ShellAction } from './shortcuts.ts';

function typeKeys(...keys: string[]): ShellAction[] {
	const actions: ShellAction[] = [];
	const handle = shortcutHandler({
		isTyping: () => false,
		isReading: () => false,
		run: (action) => {
			actions.push(action);
		},
	});
	for (const key of keys) {
		handle(new KeyboardEvent('keydown', { key }));
	}
	return actions;
}

describe('shortcutHandler', () => {
	it('lets Shift through a sequence: Space ? on most layouts', () => {
		expect(typeKeys(' ', 'Shift', '?')).toEqual(['palette']);
	});

	it('still cancels a sequence on another key', () => {
		expect(typeKeys(' ', 'z', '?')).toEqual([]);
	});
});
