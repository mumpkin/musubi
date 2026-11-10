// SPDX-License-Identifier: GPL-3.0-or-later
// Text objects of `mi` and `ma`, ported from Helix (`textobject.rs`,
// `surround.rs`). Objects that need a syntax tree (functions, arguments,
// comments…) are not available.
import type { Span } from './text.ts';

export type ObjectSide = 'inside' | 'around';

type Category = 'lineEnd' | 'whitespace' | 'word' | 'punctuation';

function category(character: string | undefined): Category {
	if (character === '\n') {
		return 'lineEnd';
	}
	if (character === undefined || /\s/u.test(character)) {
		return 'whitespace';
	}
	return /[\p{L}\p{N}_]/u.test(character) ? 'word' : 'punctuation';
}

function isBlank(character: string | undefined): boolean {
	const kind = category(character);
	return kind === 'whitespace' || kind === 'lineEnd';
}

// Whether a word, scanned by `step`, ends before `character`: at
// whitespace, or (for a word, not a WORD) where the kind of character
// changes.
function endsBefore(
	character: string | undefined,
	previous: Category,
	long: boolean,
): boolean {
	return character === undefined
		|| isBlank(character)
		|| (!long && category(character) !== previous);
}

// Edge of the word around `start`, as `find_word_boundary` in Helix: a WORD
// (`long`) only stops at whitespace. Kinds only split words away from the
// ends of the text.
function wordBoundary(
	text: string,
	start: number,
	{ step, long }: { step: 1 | -1; long: boolean },
): number {
	let position = start;
	let previous = category(step === 1 ? text[position - 1] : text[position]);
	for (;;) {
		const character = step === 1 ? text[position] : text[position - 1];
		const isEdge = position === 0 || position === text.length;
		if (endsBefore(character, previous, long || isEdge)) {
			return position;
		}
		previous = category(character);
		position += step;
	}
}

function countWhile(
	text: string,
	from: number,
	{ step, test }: { step: 1 | -1; test: (character: string) => boolean },
): number {
	let count = 0;
	let position = step === 1 ? from : from - 1;
	const isInside = (index: number): boolean =>
		index >= 0 && index < text.length;
	while (isInside(position) && test(text.charAt(position))) {
		count += 1;
		position += step;
	}
	return count;
}

const isSpace = (character: string): boolean =>
	category(character) === 'whitespace';

// `w` and `W`: the word under the cursor; around adds the whitespace after
// it, or before it if there is none after.
export function wordObject(
	text: string,
	cursor: number,
	{ side, long }: { side: ObjectSide; long: boolean },
): Span {
	const start = wordBoundary(text, cursor, { step: -1, long });
	const end = isBlank(text[cursor])
		? cursor
		: wordBoundary(text, cursor + 1, { step: 1, long });
	if (start === end || side === 'inside') {
		return { anchor: start, head: end };
	}
	const after = countWhile(text, end, { step: 1, test: isSpace });
	if (after > 0) {
		return { anchor: start, head: end + after };
	}
	const before = countWhile(text, start, { step: -1, test: isSpace });
	return { anchor: start - before, head: end };
}
