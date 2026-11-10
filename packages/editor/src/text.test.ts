// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import { nextWordEnd, nextWordStart, previousWordStart } from './text.ts';

describe('nextWordStart (w)', () => {
	it('selects the word and the following whitespace', () => {
		expect(nextWordStart('one two', 0)).toEqual({ anchor: 0, head: 4 });
	});

	it('starts on the next word from the end of a word', () => {
		expect(nextWordStart('one two three', 3)).toEqual({
			anchor: 4,
			head: 8,
		});
	});

	it('stops at punctuation', () => {
		expect(nextWordStart('one.two', 0)).toEqual({ anchor: 0, head: 3 });
	});

	it('skips line ends', () => {
		expect(nextWordStart('one\ntwo', 2)).toEqual({ anchor: 4, head: 7 });
	});
});

describe('nextWordEnd (e)', () => {
	it('selects up to the end of the next word', () => {
		expect(nextWordEnd('one two', 2)).toEqual({ anchor: 3, head: 7 });
	});

	it('selects the end of the current word', () => {
		expect(nextWordEnd('one two', 0)).toEqual({ anchor: 0, head: 3 });
	});
});

describe('previousWordStart (b)', () => {
	it('goes back to the start of the word', () => {
		expect(previousWordStart('one two', 6)).toEqual({ anchor: 7, head: 4 });
	});

	it('goes to the previous word from the start of a word', () => {
		expect(previousWordStart('one two', 4)).toEqual({ anchor: 4, head: 0 });
	});

	it('handles accents as word characters', () => {
		expect(previousWordStart('un été', 5)).toEqual({ anchor: 6, head: 3 });
	});
});
