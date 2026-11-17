// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import { findMatches } from './text-search.ts';

function html(markup: string): Element {
	const root = document.createElement('div');
	root.innerHTML = markup;
	return root;
}

const texts = (ranges: Range[]): string[] =>
	ranges.map((range) => range.toString());

describe('findMatches', () => {
	it('finds matches across the text nodes of the note', () => {
		const root = html('<p>A <strong>cat</strong>alog and a cat.</p>');
		expect(texts(findMatches(root, 'catalog'))).toEqual(['catalog']);
		expect(texts(findMatches(root, 'cat'))).toEqual(['cat', 'cat']);
	});

	it('ignores case unless the pattern has capitals', () => {
		const root = html('<p>Cat cat</p>');
		expect(findMatches(root, 'cat')).toHaveLength(2);
		expect(findMatches(root, 'Cat')).toHaveLength(1);
	});

	it('reads an invalid expression as plain text', () => {
		const root = html('<p>f(x) and fx</p>');
		expect(texts(findMatches(root, 'f(x'))).toEqual(['f(x']);
	});

	it('finds nothing for an empty pattern or an empty note', () => {
		expect(findMatches(html('<p>text</p>'), '')).toEqual([]);
		expect(findMatches(html(''), 'x')).toEqual([]);
	});
});
