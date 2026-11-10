// SPDX-License-Identifier: GPL-3.0-or-later
// Match mode (`m`): text objects, surrounding delimiters and matching
// brackets, as in Helix.
import {
	EditorSelection,
	type EditorState,
	type SelectionRange,
} from '@codemirror/state';

import { changeMode, type Command, currentMode } from './context.ts';
import {
	findClosestPair,
	findPair,
	matchingBracket,
	pairOf,
	type PairPositions,
} from './pairs.ts';
import { paragraphObject } from './paragraph.ts';
import {
	asCharacters,
	characterAt,
	cursorOf,
	extend,
	mapRanges,
	toRange,
	withCharacters,
} from './selection.ts';
import type { Span } from './text.ts';
import { type ObjectSide, wordObject } from './textobjects.ts';

const CLOSEST_PAIR = 'm';
const PAIR_SIZE = 2;

function pairAround(
	state: EditorState,
	range: SelectionRange,
	character: string,
): PairPositions | undefined {
	const text = state.doc.toString();
	if (character === CLOSEST_PAIR) {
		return findClosestPair(text, range);
	}
	return range.to >= text.length
		? undefined
		: findPair(text, character, cursorOf(range));
}

function objectSpan(
	state: EditorState,
	range: SelectionRange,
	{ side, object }: { side: ObjectSide; object: string },
): Span | undefined {
	const text = state.doc.toString();
	const cursor = cursorOf(range);
	if (object === 'w' || object === 'W') {
		return wordObject(text, cursor, { side, long: object === 'W' });
	}
	if (object === 'p') {
		return paragraphObject(state, cursor, side);
	}
	const pair = pairAround(state, range, object);
	if (!pair) {
		return undefined;
	}
	return side === 'inside'
		? { anchor: pair.open + 1, head: pair.close }
		: { anchor: pair.open, head: pair.close + 1 };
}

// `mi` and `ma` followed by an object key.
function selectObject(side: ObjectSide): Command {
	return ({ target }, object = '') => {
		const { state } = target;
		const selection = mapRanges(state, (range) => {
			const span = objectSpan(state, range, { side, object });
			if (!span) {
				return range;
			}
			// An empty object selects at least the character under it.
			return span.anchor === span.head
				? toRange(characterAt(state, span.anchor))
				: toRange(span);
		});
		target.dispatch({ selection });
	};
}

// `ms`: the delimiters of `character` around each selection, selected with
// it.
const surroundAdd: Command = ({ target }, character = '') => {
	const { state } = target;
	const [open, close] = pairOf(character);
	const ranges = state.selection.ranges.map(
		(range) => asCharacters(state, range),
	);
	const changes = state.changes(ranges.flatMap(({ from, to }) => [
		{ from, insert: open },
		{ from: to, insert: close },
	]));
	const selection = EditorSelection.create(
		state.selection.ranges.map((range, index) => {
			const span = ranges[index] ?? range;
			const from = changes.mapPos(span.from, -1);
			const to = changes.mapPos(span.to, 1);
			return range.head < range.anchor
				? EditorSelection.range(to, from)
				: EditorSelection.range(from, to);
		}),
		state.selection.mainIndex,
	);
	target.dispatch({ changes, selection });
	changeMode(target, 'normal');
};

// Positions of the delimiters around every selection, or nothing if one is
// missing or two selections share a delimiter.
function surroundPositions(
	state: EditorState,
	character: string,
): number[] | undefined {
	const positions: number[] = [];
	for (const range of state.selection.ranges) {
		const pair = pairAround(state, range, character);
		if (!pair || positions.includes(pair.open)) {
			return undefined;
		}
		positions.push(pair.open, pair.close);
	}
	return positions.sort((left, right) => left - right);
}

function replaceDelimiters(
	{ target }: Parameters<Command>[0],
	{ from, to }: { from: string; to: string | undefined },
): void {
	const { state } = target;
	const positions = surroundPositions(state, from);
	if (!positions) {
		return;
	}
	const [open, close] = to === undefined ? ['', ''] : pairOf(to);
	const changes = positions.map((position, index) => ({
		from: position,
		to: position + 1,
		// Positions alternate: opening, closing, opening…
		insert: index % PAIR_SIZE === 0 ? open : close,
	}));
	target.dispatch({ changes });
	target.dispatch({ selection: withCharacters(target.state) });
	changeMode(target, 'normal');
}

// `md`: deletes the delimiters around each selection.
const surroundDelete: Command = (context, character = '') => {
	replaceDelimiters(context, { from: character, to: undefined });
};

// `mr`: replaces the delimiters `from` by those of `to`.
const surroundReplace: Command = (context, characters = '') => {
	const from = characters.charAt(0);
	const to = characters.charAt(1);
	replaceDelimiters(context, { from, to });
};

// `mm`: the bracket matching the one under the cursor.
const matchBrackets: Command = ({ target }) => {
	const { state } = target;
	const text = state.doc.toString();
	const isSelecting = currentMode(state) === 'select';
	const selection = mapRanges(state, (range) => {
		const match = matchingBracket(text, cursorOf(range));
		if (match === undefined) {
			return range;
		}
		const span = characterAt(state, match);
		return isSelecting ? extend(range, span) : toRange(span);
	});
	target.dispatch({ selection });
};

export const objectCommands = {
	selectInside: selectObject('inside'),
	selectAround: selectObject('around'),
	surroundAdd,
	surroundDelete,
	surroundReplace,
	matchBrackets,
} satisfies Record<string, Command>;
