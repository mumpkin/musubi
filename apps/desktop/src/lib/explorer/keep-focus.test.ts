// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import { focusedEntry, restoreFocus } from './keep-focus.ts';

function explorer(): HTMLElement {
	const nav = document.createElement('nav');
	nav.innerHTML = '<section aria-label="Recent">'
		+ '<button data-path="A.typ">A</button></section>'
		+ '<section aria-label="Notebook">'
		+ '<button data-path="A.typ">A</button></section>';
	document.body.append(nav);
	return nav;
}

describe('restoreFocus', () => {
	it('gives the focus back to the same entry of the same section', () => {
		const nav = explorer();
		const recent = nav.querySelector<HTMLElement>('section button');
		recent?.focus();
		const kept = focusedEntry(nav);
		expect(kept).toEqual({ path: 'A.typ', section: 'Recent' });
		recent?.blur();
		restoreFocus(nav, kept);
		expect(document.activeElement).toBe(recent);
		nav.remove();
	});

	it('leaves the focus where the user put it', () => {
		const nav = explorer();
		nav.querySelector<HTMLElement>('button')?.focus();
		const kept = focusedEntry(nav);
		const elsewhere = document.createElement('input');
		document.body.append(elsewhere);
		elsewhere.focus();
		restoreFocus(nav, kept);
		expect(document.activeElement).toBe(elsewhere);
		elsewhere.remove();
		nav.remove();
	});
});
