// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import { LinkCursor } from './link-cursor.ts';

function page(): HTMLElement {
	const container = document.createElement('article');
	container.innerHTML = '<p class="selected-block"><a href="#a">a</a> '
		+ '<a href="#b">b</a> <a href="#c">c</a></p><p><a href="#d">d</a></p>';
	return container;
}

const selected = (container: Element): string | undefined =>
	container.querySelector('.selected-link')?.textContent;

describe('LinkCursor', () => {
	it('moves between the links of the selected block only', () => {
		const container = page();
		const cursor = new LinkCursor(() => container);
		cursor.move(1);
		cursor.move(1);
		expect(selected(container)).toBe('b');
		cursor.move(1);
		cursor.move(1);
		expect(selected(container)).toBe('c');
		cursor.move(-1);
		expect(selected(container)).toBe('b');
	});

	it('follows the selected link, and forgets it on clear', () => {
		const container = page();
		const cursor = new LinkCursor(() => container);
		const clicked: string[] = [];
		container.addEventListener('click', (event) => {
			event.preventDefault();
			clicked.push((event.target as Element).textContent);
		});
		expect(cursor.follow()).toBe(false);
		cursor.move(-1);
		expect(cursor.follow()).toBe(true);
		expect(clicked).toEqual(['c']);
		cursor.clear();
		expect(cursor.isActive).toBe(false);
		expect(selected(container)).toBeUndefined();
	});
});
