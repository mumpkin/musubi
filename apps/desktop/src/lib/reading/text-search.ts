// SPDX-License-Identifier: GPL-3.0-or-later
// Search in the rendered text of the reading view: matches of a pattern as
// DOM ranges, shown with the CSS Custom Highlight API.

const MATCHES = 'musubi-search';
const CURRENT = 'musubi-search-current';

// A pattern as in the editor: a regular expression, ignoring case unless
// it has capitals; plain text if it is not a valid expression.
function expression(pattern: string): RegExp {
	const flags = /\p{Lu}/u.test(pattern) ? 'gu' : 'giu';
	try {
		return new RegExp(pattern, flags);
	} catch {
		return new RegExp(pattern.replaceAll(/[.*+?^${}()|[\]\\/]/gu, '\\$&'), flags);
	}
}

interface TextPiece {
	node: Text;
	start: number;
}

function textPieces(root: Element): { pieces: TextPiece[]; text: string } {
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	const pieces: TextPiece[] = [];
	let text = '';
	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		if (node instanceof Text) {
			pieces.push({ node, start: text.length });
			text += node.data;
		}
	}
	return { pieces, text };
}

// The text node and offset of character `index` of the whole text.
function pointAt(pieces: TextPiece[], index: number): [Text, number] {
	const piece = pieces.findLast((candidate) => candidate.start <= index)
		?? pieces[0];
	if (!piece) {
		throw new Error('no text to search');
	}
	return [piece.node, index - piece.start];
}

// Ranges of the matches of `pattern` in the text of `root`, in order.
export function findMatches(root: Element, pattern: string): Range[] {
	const { pieces, text } = textPieces(root);
	if (pattern === '' || pieces.length === 0) {
		return [];
	}
	return [...text.matchAll(expression(pattern))]
		.filter((found) => found[0].length > 0)
		.map((found) => {
			const range = document.createRange();
			range.setStart(...pointAt(pieces, found.index));
			range.setEnd(...pointAt(pieces, found.index + found[0].length));
			return range;
		});
}

// Highlights `matches`, and `current` among them more strongly.
export function showMatches(matches: Range[], current: Range | undefined) {
	if (!('highlights' in CSS)) {
		return;
	}
	CSS.highlights.set(MATCHES, new Highlight(...matches));
	CSS.highlights.set(CURRENT, new Highlight(...(current ? [current] : [])));
}

export function clearMatches(): void {
	if ('highlights' in CSS) {
		CSS.highlights.delete(MATCHES);
		CSS.highlights.delete(CURRENT);
	}
}
