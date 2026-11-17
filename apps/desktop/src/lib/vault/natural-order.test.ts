// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import { naturalCompare, naturalPathCompare } from './natural-order.ts';

describe('naturalCompare', () => {
	it('orders numbers by their value and ignores case', () => {
		const names = ['Note 10', 'note 2', 'Note 1', 'Étude', 'apple'];
		expect(names.toSorted(naturalCompare))
			.toEqual(['apple', 'Étude', 'Note 1', 'note 2', 'Note 10']);
	});

	it('keeps a stable order for names that differ only by case', () => {
		expect(naturalCompare('a', 'A')).not.toBe(0);
		expect(naturalCompare('a', 'a')).toBe(0);
	});
});

describe('naturalPathCompare', () => {
	it('puts a folder right before what it holds', () => {
		const paths = ['Area 10', 'Area 2/Topic 1', 'Area 2', 'Area 2 bis'];
		expect(paths.toSorted(naturalPathCompare))
			.toEqual(['Area 2', 'Area 2/Topic 1', 'Area 2 bis', 'Area 10']);
	});
});
