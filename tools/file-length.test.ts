// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import {
	countNonBlankLines,
	isTooLong,
	MAX_LINES_PER_FILE,
} from './file-length.ts';

describe('countNonBlankLines', () => {
	it('ignores empty and whitespace-only lines', () => {
		expect(countNonBlankLines('first\n\n   \nsecond\n')).toBe(2);
	});
});

describe('isTooLong', () => {
	it('accepts a file at the limit', () => {
		expect(isTooLong('line\n'.repeat(MAX_LINES_PER_FILE))).toBe(false);
	});

	it('rejects a file over the limit', () => {
		expect(isTooLong('line\n'.repeat(MAX_LINES_PER_FILE + 1))).toBe(true);
	});
});
