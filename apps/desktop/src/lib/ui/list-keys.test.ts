// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it, vi } from 'vitest';

import { focusFirst, listKeydown } from './list-keys.ts';

function list(): HTMLElement {
	const container = document.createElement('ul');
	container.innerHTML = '<li><button class="item">a</button></li>'
		+ '<li><button class="item current">b</button></li>'
		+ '<li><button class="item">c</button></li>';
	document.body.replaceChildren(container);
	return container;
}

const press = (key: string) => new KeyboardEvent('keydown', { key });
const focused = () => document.activeElement?.textContent;

describe('listKeydown', () => {
	it('moves with j and k, and stays within the list', () => {
		const container = list();
		focusFirst(container, '.item', '.current');
		expect(focused()).toBe('b');
		const keys = { container, selector: '.item', onLeave: vi.fn() };
		listKeydown(press('j'), keys);
		listKeydown(press('j'), keys);
		expect(focused()).toBe('c');
		listKeydown(press('k'), keys);
		expect(focused()).toBe('b');
	});

	it('opens with l and leaves with Escape', () => {
		const container = list();
		focusFirst(container, '.item', '.missing');
		const clicked = vi.fn();
		container.querySelector('.item')?.addEventListener('click', clicked);
		const onLeave = vi.fn();
		listKeydown(press('l'), { container, selector: '.item', onLeave });
		listKeydown(press('Escape'), { container, selector: '.item', onLeave });
		expect(clicked).toHaveBeenCalledOnce();
		expect(onLeave).toHaveBeenCalledOnce();
	});

	it('leaves keys with Ctrl to the shortcuts', () => {
		const container = list();
		const event = new KeyboardEvent('keydown', { key: 'j', ctrlKey: true });
		listKeydown(event, { container, selector: '.item', onLeave: vi.fn() });
		expect(event.defaultPrevented).toBe(false);
	});
});
