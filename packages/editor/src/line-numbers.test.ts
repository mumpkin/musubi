// SPDX-License-Identifier: GPL-3.0-or-later
import { EditorSelection, EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';

import { relativeNumber } from './line-numbers.ts';

// `one\n\nthree\nfour`: line 2 is empty.
const DOC = 'one\n\nthree\nfour';

function numbers(anchor: number, head: number): string[] {
	const state = EditorState.create({
		doc: DOC,
		selection: EditorSelection.single(anchor, head),
	});
	return [1, 2, 3, 4].map((line) =>
		relativeNumber(state, state.doc.line(line).from));
}

describe('relativeNumber', () => {
	it('counts from the line of the cursor', () => {
		expect(numbers(6, 7)).toEqual(['2', '1', '3', '1']);
	});

	it('takes an empty line, whose line break is selected', () => {
		// The selection of the line break ends at the start of line 3.
		expect(numbers(4, 5)).toEqual(['1', '2', '1', '2']);
	});
});
