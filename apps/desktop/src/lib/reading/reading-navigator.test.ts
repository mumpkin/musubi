// SPDX-License-Identifier: GPL-3.0-or-later
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReadingNavigator, type ReadingSurface } from './reading-navigator.ts';

interface Probe {
	surface: ReadingSurface;
	selected: () => number | undefined;
	prompts: string[];
	scrolled: number[];
}

// A note of three blocks over source lines 0–1, 3 and 5–6.
function probe(): Probe {
	const container = document.createElement('div');
	container.innerHTML = '<p data-block="0">One cat</p>'
		+ '<p data-block="1">two</p>'
		+ '<p data-block="2">cat and cat</p>';
	document.body.replaceChildren(container);
	let selected: number | undefined = 0;
	const prompts: string[] = [];
	const scrolled: number[] = [];
	const scroller = document.createElement('div');
	scroller.scrollBy = ((options: ScrollToOptions) => {
		scrolled.push(options.top ?? 0);
	}) as typeof scroller.scrollBy;
	const surface: ReadingSurface = {
		container,
		scroller,
		blocks: () => [0, 1, 2],
		sourceBlocks: () => [
			{ startLine: 0, endLine: 1 },
			{ startLine: 3, endLine: 3 },
			{ startLine: 5, endLine: 6 },
		],
		selected: () => selected,
		select: (block) => {
			selected = block;
		},
		openPrompt: (kind) => {
			prompts.push(kind);
		},
	};
	return { surface, selected: () => selected, prompts, scrolled };
}

describe('ReadingNavigator', () => {
	beforeEach(() => {
		Element.prototype.scrollIntoView = vi.fn();
	});

	it('moves between blocks with j and k, counts included', () => {
		const { surface, selected } = probe();
		const navigator = new ReadingNavigator(surface);
		navigator.run('moveLineDown', 2);
		expect(selected()).toBe(2);
		navigator.run('moveLineUp');
		expect(selected()).toBe(1);
	});

	it('goes to the end, and to the block of a source line', () => {
		const { surface, selected } = probe();
		const navigator = new ReadingNavigator(surface);
		navigator.run('gotoLastLine');
		expect(selected()).toBe(2);
		navigator.run('gotoLine', 4);
		expect(selected()).toBe(1);
		navigator.run('gotoFileStart');
		expect(selected()).toBe(0);
	});

	it('searches after the cursor, then wraps with n and N', () => {
		const { surface, selected } = probe();
		const navigator = new ReadingNavigator(surface);
		navigator.search('cat', true);
		expect(selected()).toBe(2);
		navigator.run('searchNext', 2);
		expect(selected()).toBe(0);
		navigator.run('searchPrevious');
		expect(selected()).toBe(2);
		navigator.clear();
		navigator.run('searchNext');
		expect(selected()).toBe(2);
	});

	it('opens the prompts and scrolls by pages', () => {
		const { surface, prompts, scrolled } = probe();
		const navigator = new ReadingNavigator(surface);
		navigator.run('searchForward');
		navigator.run('searchBackward');
		navigator.run('pageDown');
		expect(prompts).toEqual(['search', 'reverseSearch']);
		expect(scrolled).toHaveLength(1);
		expect(navigator.run('alignViewCenter')).toBe(true);
	});

	it('leaves the commands it does not know', () => {
		const { surface } = probe();
		expect(new ReadingNavigator(surface).run('insertMode')).toBe(false);
	});
});
