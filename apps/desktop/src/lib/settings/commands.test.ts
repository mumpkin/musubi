// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import { AUTOSAVE_DELAY, boundedNumber, TRASH_RETENTION } from './commands.ts';

describe('boundedNumber', () => {
	it('accepts whole numbers within the bounds', () => {
		expect(boundedNumber('5', AUTOSAVE_DELAY)).toBe(5);
		expect(boundedNumber('0', TRASH_RETENTION)).toBe(0);
	});

	it('refuses anything else', () => {
		for (const text of ['0', '61', '2.5', 'abc', '-1', '']) {
			expect(boundedNumber(text, AUTOSAVE_DELAY), text).toBeUndefined();
		}
		expect(boundedNumber(' ', TRASH_RETENTION)).toBeUndefined();
	});
});
