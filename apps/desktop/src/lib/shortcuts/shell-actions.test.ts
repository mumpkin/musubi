// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import { typingCheck } from './shell-actions.ts';

type Parts = Parameters<typeof typingCheck>[0];

function check(target: Element, modes: { tree: string; pane: string }) {
	const parts = {
		manager: { editorMode: modes.pane },
		dialogs: { isOpen: false },
		editing: { mode: modes.tree },
	} as unknown as Parts;
	const event = new KeyboardEvent('keydown', { key: ' ' });
	Object.defineProperty(event, 'target', { value: target });
	return typingCheck(parts)(event);
}

function inside(className: string): Element {
	const host = document.createElement('div');
	host.innerHTML = `<div class="${className}"><div class="cm-editor">`
		+ '<div class="cm-content"></div></div></div>';
	return host.querySelector('.cm-content') ?? host;
}

describe('typingCheck', () => {
	it('follows the mode of the tree editor the key goes to', () => {
		const modes = { tree: 'insert', pane: 'normal' };
		expect(check(inside('tree-editor'), modes)).toBe(true);
		expect(check(inside('pane'), modes)).toBe(false);
	});

	it('follows the mode of the note editor the key goes to', () => {
		const modes = { tree: 'normal', pane: 'insert' };
		expect(check(inside('pane'), modes)).toBe(true);
		expect(check(inside('tree-editor'), modes)).toBe(false);
	});
});
