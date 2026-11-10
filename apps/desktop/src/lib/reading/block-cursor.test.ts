// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import { blockAt, moveCursor, renderedBlocks } from './block-cursor.ts';

function container(html: string): HTMLElement {
	const element = document.createElement('div');
	element.innerHTML = html;
	return element;
}

describe('renderedBlocks', () => {
	it('lists the blocks in reading order, once each', () => {
		const note = container(
			'<h2 data-block="1">T</h2><ul><li data-block="3">a</li>'
			+ '<li data-block="4">b</li></ul><p data-block="4">c</p>',
		);
		expect(renderedBlocks(note)).toEqual([1, 3, 4]);
	});
});

describe('moveCursor', () => {
	const blocks = [1, 3, 4];

	it('starts at the first block going down, the last going up', () => {
		expect(moveCursor(blocks, undefined, 1)).toBe(1);
		expect(moveCursor(blocks, undefined, -1)).toBe(4);
	});

	it('moves to the next and previous blocks', () => {
		expect(moveCursor(blocks, 1, 1)).toBe(3);
		expect(moveCursor(blocks, 4, -1)).toBe(3);
	});

	it('stays in bounds', () => {
		expect(moveCursor(blocks, 4, 1)).toBe(4);
		expect(moveCursor(blocks, 1, -1)).toBe(1);
	});

	it('has no block in an empty note', () => {
		expect(moveCursor([], undefined, 1)).toBeUndefined();
	});
});

describe('blockAt', () => {
	it('finds the block of a nested element', () => {
		const note = container('<p data-block="2">a <strong>b</strong></p>');
		const strong = note.querySelector('strong');
		expect(strong && blockAt(strong)).toBe(2);
	});
});
