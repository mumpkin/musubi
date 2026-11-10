// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import { resolveShortcut, shortcutLabel } from './shortcuts.ts';

function press(...keys: string[]) {
	let pending = '';
	let last = resolveShortcut('', '');
	for (const key of keys) {
		last = resolveShortcut(pending, key);
		pending = last.pending;
	}
	return last;
}

describe('resolveShortcut', () => {
	it('opens the Space menu, then runs its command', () => {
		expect(press('Space')).toEqual({ pending: 'Space', isUsed: true });
		expect(press('Space', 'e').action).toBe('toggleExplorer');
	});

	it('knows the pane commands of Helix', () => {
		expect(press('C-w', 'v').action).toBe('split');
		expect(press('C-w', 'q').action).toBe('closePane');
		expect(press('C-w', 'C-w').action).toBe('nextPane');
	});

	it('leaves other keys to the panes', () => {
		expect(press('j')).toEqual({ pending: '', isUsed: false });
	});

	it('swallows an unknown key after a prefix, and Escape', () => {
		expect(press('Space', 'z')).toEqual({ pending: '', isUsed: true });
		expect(press('C-w', 'Escape')).toEqual({ pending: '', isUsed: true });
	});
});

describe('shortcutLabel', () => {
	it('spells Ctrl out', () => {
		expect(shortcutLabel('split')).toBe('Ctrl-w v');
		expect(shortcutLabel('toggleExplorer')).toBe('Space e');
	});
});
