// SPDX-License-Identifier: GPL-3.0-or-later
// Word motions with the semantics of Helix, on plain text. Positions are
// offsets between characters; a "cursor" is the index of the character the
// block cursor sits on.

type Category = 'lineEnd' | 'whitespace' | 'word' | 'punctuation';

const WORD_CHARACTER = /[\p{L}\p{N}_]/u;
const WHITESPACE = /\s/u;

function category(character: string | undefined): Category | undefined {
	if (character === undefined) {
		return undefined;
	}
	if (character === '\n') {
		return 'lineEnd';
	}
	if (WHITESPACE.test(character)) {
		return 'whitespace';
	}
	return WORD_CHARACTER.test(character) ? 'word' : 'punctuation';
}

// A motion selects from `anchor` to `head`; `head` may be before `anchor`.
export interface Span {
	anchor: number;
	head: number;
	// Column that `j` and `k` keep, as in Helix (sticky column).
	goal?: number | undefined;
}

function isBoundary(text: string, left: number): boolean {
	return category(text[left]) !== category(text[left + 1]);
}

// Start of the next selection of a forward motion: on a boundary the motion
// starts on the next character, and line ends are skipped.
function forwardStart(text: string, cursor: number): number {
	let start = cursor;
	if (start + 1 < text.length && isBoundary(text, start)) {
		start += 1;
	}
	while (start < text.length - 1 && text[start] === '\n') {
		start += 1;
	}
	return start;
}

function skip(text: string, from: number, wanted: Category): number {
	let position = from;
	while (position < text.length && category(text[position]) === wanted) {
		position += 1;
	}
	return position;
}

function skipWord(text: string, from: number): number {
	const wanted = category(text[from]);
	if (wanted === undefined || wanted === 'lineEnd') {
		return Math.min(from + 1, text.length);
	}
	return skip(text, from, wanted);
}

// `w`: the rest of the word and the whitespace after it.
export function nextWordStart(text: string, cursor: number): Span {
	const anchor = forwardStart(text, cursor);
	const head = skip(text, skipWord(text, anchor), 'whitespace');
	return { anchor, head };
}

// `e`: the whitespace before the next word end, and the word.
export function nextWordEnd(text: string, cursor: number): Span {
	const anchor = forwardStart(text, cursor);
	const head = skipWord(text, skip(text, anchor, 'whitespace'));
	return { anchor, head };
}

// `b`: back to the start of the current or previous word.
export function previousWordStart(text: string, cursor: number): Span {
	let start = Math.min(cursor, text.length - 1);
	if (start > 0 && category(text[start - 1]) !== category(text[start])) {
		start -= 1;
	}
	while (start > 0 && text[start] === '\n') {
		start -= 1;
	}
	let head = start;
	while (head > 0 && category(text[head]) === 'whitespace') {
		head -= 1;
	}
	const wanted = category(text[head]);
	while (head > 0 && category(text[head - 1]) === wanted) {
		head -= 1;
	}
	return { anchor: start + 1, head };
}
