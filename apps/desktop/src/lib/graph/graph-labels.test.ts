// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import { boxAt, LabelSpace } from './graph-labels.ts';

const size = { width: 40, height: 12, margin: 2 };

describe('LabelSpace', () => {
	it('takes a box only where no other title is', () => {
		const space = new LabelSpace();
		expect(space.take(boxAt(100, 100, size))).toBe(true);
		expect(space.take(boxAt(120, 105, size))).toBe(false);
		expect(space.take(boxAt(100, 120, size))).toBe(true);
		expect(space.take(boxAt(200, 100, size))).toBe(true);
	});

	it('finds boxes that span several cells', () => {
		const space = new LabelSpace();
		expect(space.take(boxAt(64, 64, { ...size, width: 300 }))).toBe(true);
		expect(space.take(boxAt(200, 60, size))).toBe(false);
	});
});

describe('boxAt', () => {
	it('centres the title and keeps a margin around it', () => {
		expect(boxAt(100, 10, size)).toEqual({
			left: 78,
			top: 8,
			right: 122,
			bottom: 24,
		});
	});
});
