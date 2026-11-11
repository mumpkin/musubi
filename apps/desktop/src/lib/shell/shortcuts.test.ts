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

	it('knows the window menu of Helix', () => {
		expect(press('Space', 'w')).toEqual({
			pending: 'Space w',
			isUsed: true,
		});
		expect(press('Space', 'w', 'v').action).toBe('split');
		expect(press('Space', 'w', 'q').action).toBe('closePane');
		expect(press('Space', 'w', 'w').action).toBe('nextPane');
	});

	it('moves across the panels and leaves Ctrl-w alone', () => {
		expect(press('Space', 'h').action).toBe('leftPanel');
		expect(press('Space', 'l').action).toBe('rightPanel');
		expect(press('Space', 'b').action).toBe('toggleBacklinks');
		expect(press('C-w')).toEqual({ pending: '', isUsed: false });
	});

	it('leaves other keys to the panes', () => {
		expect(press('j')).toEqual({ pending: '', isUsed: false });
	});

	it('swallows an unknown key after a prefix, and Escape', () => {
		expect(press('Space', 'z')).toEqual({ pending: '', isUsed: true });
		expect(press('Space', 'w', 'Escape')).toEqual({
			pending: '',
			isUsed: true,
		});
	});
});

describe('shortcutLabel', () => {
	it('shows the first sequence of an action', () => {
		expect(shortcutLabel('palette')).toBe('Space ?');
		expect(shortcutLabel('split')).toBe('Space w v');
		expect(shortcutLabel('toggleExplorer')).toBe('Space e');
	});
});
