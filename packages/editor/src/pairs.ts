// SPDX-License-Identifier: GPL-3.0-or-later
// Pairs of delimiters, ported from Helix (`match_brackets.rs`,
// `surround.rs`). Quotes open and close with the same character.

const BRACKETS: [string, string][] = [
	['(', ')'],
	['{', '}'],
	['[', ']'],
	['<', '>'],
	['«', '»'],
	['「', '」'],
	['（', '）'],
];

// Opening and closing characters for `character`, which may be either; any
// other character pairs with itself.
export function pairOf(character: string): [string, string] {
	const bracket = BRACKETS.find((pair) => pair.includes(character));
	return bracket ?? [character, character];
}

const isOpenBracket = (character: string): boolean =>
	BRACKETS.some(([open]) => open === character);

const isCloseBracket = (character: string): boolean =>
	BRACKETS.some(([, close]) => close === character);

interface Pair {
	open: string;
	close: string;
}

// Opening delimiter before `position`, stepping over nested pairs.
export function findOpen(text: string, { open, close }: Pair, start: number) {
	if (text[start] === open) {
		return start;
	}
	let nested = 0;
	for (let position = start - 1; position >= 0; position -= 1) {
		const character = text[position];
		if (character === close) {
			nested += 1;
		} else if (character === open) {
			if (nested === 0) {
				return position;
			}
			nested -= 1;
		}
	}
	return undefined;
}

// Closing delimiter after `position`, stepping over nested pairs.
function findClose(text: string, { open, close }: Pair, start: number) {
	if (text[start] === close) {
		return start;
	}
	let nested = 0;
	for (let position = start + 1; position < text.length; position += 1) {
		const character = text[position];
		if (character === open) {
			nested += 1;
		} else if (character === close) {
			if (nested === 0) {
				return position;
			}
			nested -= 1;
		}
	}
	return undefined;
}

export interface PairPositions {
	open: number;
	close: number;
}

// Quotes open and close with the same character: the nearest one on each
// side. On a quote, there is no telling which side the pair is on.
function findQuotePair(
	text: string,
	quote: string,
	cursor: number,
): PairPositions | undefined {
	if (text[cursor] === quote || cursor === 0) {
		return undefined;
	}
	const before = text.lastIndexOf(quote, cursor - 1);
	const after = text.indexOf(quote, cursor);
	return before >= 0 && after >= 0
		? { open: before, close: after }
		: undefined;
}

// The pair of `character` around `cursor`, as `find_nth_pairs_pos`.
export function findPair(
	text: string,
	character: string,
	cursor: number,
): PairPositions | undefined {
	const [open, close] = pairOf(character);
	if (cursor >= text.length) {
		return undefined;
	}
	if (open === close) {
		return findQuotePair(text, open, cursor);
	}
	const openPosition = findOpen(text, { open, close }, cursor);
	const closePosition = findClose(text, { open, close }, cursor);
	return openPosition === undefined || closePosition === undefined
		? undefined
		: { open: openPosition, close: closePosition };
}

// A closing bracket at `position` whose opening bracket encloses
// `from`–`to`.
function enclosingPair(
	text: string,
	position: number,
	{ from, to }: { from: number; to: number },
): PairPositions | undefined {
	const [open, close] = pairOf(text.charAt(position));
	const openPosition = findOpen(text, { open, close }, position);
	const encloses = openPosition !== undefined
		&& openPosition <= from + 1
		&& position >= to - 1;
	return encloses ? { open: openPosition, close: position } : undefined;
}

// The closest bracket pair enclosing `from`–`to`, as
// `find_nth_closest_pairs_plain`: brackets opened after `from` are stepped
// over, and quotes are not considered.
export function findClosestPair(
	text: string,
	range: { from: number; to: number },
): PairPositions | undefined {
	const stack: string[] = [];
	for (let position = range.from; position < text.length; position += 1) {
		const character = text.charAt(position);
		if (isOpenBracket(character)) {
			stack.push(character);
		} else if (isCloseBracket(character)) {
			if (stack.at(-1) === pairOf(character)[0]) {
				stack.pop();
				continue;
			}
			const pair = enclosingPair(text, position, range);
			if (pair) {
				return pair;
			}
		}
	}
	return undefined;
}

interface Balance {
	bracket: string;
	matching: string;
	step: 1 | -1;
}

// Scans from `start` by `step`, counting `bracket` and `matching`, until
// they balance.
function balancingPosition(
	text: string,
	start: number,
	{ bracket, matching, step }: Balance,
): number | undefined {
	let depth = 1;
	for (let position = start; position >= 0 && position < text.length;
		position += step) {
		if (text[position] === bracket) {
			depth += 1;
		} else if (text[position] === matching) {
			depth -= 1;
		}
		if (depth === 0) {
			return position;
		}
	}
	return undefined;
}

// The bracket matching the one at `cursor`, as
// `find_matching_bracket_plaintext`: brackets of the same kind in between
// are counted.
export function matchingBracket(
	text: string,
	cursor: number,
): number | undefined {
	const bracket = text.charAt(cursor);
	if (!isOpenBracket(bracket) && !isCloseBracket(bracket)) {
		return undefined;
	}
	const [open, close] = pairOf(bracket);
	const step = bracket === open ? 1 : -1;
	const matching = bracket === open ? close : open;
	return balancingPosition(text, cursor + step, { bracket, matching, step });
}
