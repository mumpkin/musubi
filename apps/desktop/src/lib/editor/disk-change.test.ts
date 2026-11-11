// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import { diskChange } from './disk-change.ts';

function apply(text: string, next: string): string {
	const { from, to, insert } = diskChange(text, next);
	return text.slice(0, from) + insert + text.slice(to);
}

describe('diskChange', () => {
	it('replaces only the part that differs', () => {
		expect(diskChange('= Title\nBody', '= Title\nNew body')).toEqual({
			from: 8,
			to: 9,
			insert: 'New b',
		});
		expect(diskChange('abc', 'ac')).toEqual({ from: 1, to: 2, insert: '' });
	});

	it('turns any text into any other', () => {
		const cases = [['', 'x'], ['x', ''], ['aaa', 'aa'], ['ab', 'ba']];
		for (const [text = '', next = ''] of cases) {
			expect(apply(text, next)).toBe(next);
		}
	});
});
