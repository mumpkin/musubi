// SPDX-License-Identifier: GPL-3.0-or-later
// Word motions with the semantics of Helix, on plain text. Positions are
// offsets between characters; a "cursor" is the index of the character the
// block cursor sits on. Words are runs of letters, digits and `_`, or of
// punctuation; long words (`W`, `B`, `E`) are runs of anything but spaces.

type Category = 'lineEnd' | 'whitespace' | 'word' | 'punctuation';

const WORD_CHARACTER = /[\p{L}\p{N}_]/u;
const WHITESPACE = /\s/u;

// A motion selects from `anchor` to `head`; `head` may be before `anchor`.
export interface Span {
	anchor: number;
	head: number;
	// Column that `j` and `k` keep, as in Helix (sticky column).
	goal?: number | undefined;
}

class Words {
	private readonly text: string;
	private readonly isLong: boolean;

	constructor(text: string, isLong: boolean) {
		this.text = text;
		this.isLong = isLong;
	}

	category(index: number): Category | undefined {
		const character = this.text[index];
		if (character === undefined) {
			return undefined;
		}
		if (character === '\n') {
			return 'lineEnd';
		}
		if (WHITESPACE.test(character)) {
			return 'whitespace';
		}
		return this.isLong || WORD_CHARACTER.test(character)
			? 'word'
			: 'punctuation';
	}

	private isBoundary(left: number): boolean {
		return this.category(left) !== this.category(left + 1);
	}

	// Start of the next selection of a forward motion: on a boundary the
	// motion starts on the next character, and line ends are skipped.
	forwardStart(cursor: number): number {
		const { text } = this;
		let start = cursor;
		if (start + 1 < text.length && this.isBoundary(start)) {
			start += 1;
		}
		while (start < text.length - 1 && text[start] === '\n') {
			start += 1;
		}
		return start;
	}

	skip(from: number, wanted: Category): number {
		let position = from;
		const { length } = this.text;
		while (position < length && this.category(position) === wanted) {
			position += 1;
		}
		return position;
	}

	skipWord(from: number): number {
		const wanted = this.category(from);
		if (wanted === undefined || wanted === 'lineEnd') {
			return Math.min(from + 1, this.text.length);
		}
		return this.skip(from, wanted);
	}

	// Back to the start of the current or previous word.
	previousStart(cursor: number): Span {
		const { text } = this;
		let start = Math.min(cursor, text.length - 1);
		if (start > 0 && this.category(start - 1) !== this.category(start)) {
			start -= 1;
		}
		while (start > 0 && text[start] === '\n') {
			start -= 1;
		}
		let head = start;
		while (head > 0 && this.category(head) === 'whitespace') {
			head -= 1;
		}
		const wanted = this.category(head);
		while (head > 0 && this.category(head - 1) === wanted) {
			head -= 1;
		}
		return { anchor: start + 1, head };
	}
}

// `w` (`W`): the rest of the word and the whitespace after it.
export function nextWordStart(
	text: string,
	cursor: number,
	isLong = false,
): Span {
	const words = new Words(text, isLong);
	const anchor = words.forwardStart(cursor);
	const head = words.skip(words.skipWord(anchor), 'whitespace');
	return { anchor, head };
}

// `e` (`E`): the whitespace before the next word end, and the word.
export function nextWordEnd(
	text: string,
	cursor: number,
	isLong = false,
): Span {
	const words = new Words(text, isLong);
	const anchor = words.forwardStart(cursor);
	const head = words.skipWord(words.skip(anchor, 'whitespace'));
	return { anchor, head };
}

// `b` (`B`): back to the start of the current or previous word.
export function previousWordStart(
	text: string,
	cursor: number,
	isLong = false,
): Span {
	return new Words(text, isLong).previousStart(cursor);
}
