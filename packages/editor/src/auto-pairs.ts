// SPDX-License-Identifier: GPL-3.0-or-later
// Auto-pairs of insert mode, ported from Helix (`helix-core/src/auto_pairs.rs`
// and `delete_char_backward`), with its default pairs:
// - an opening character also types its closing one, unless the next
//   character is a letter or a digit (for quotes, the previous one too);
// - typing the closing character in front of it steps over it;
// - `Backspace` between an empty pair deletes both.
import {
	EditorSelection,
	type EditorState,
	findClusterBreak,
	type SelectionRange,
	type TransactionSpec,
} from '@codemirror/state';

import type { Command } from './context.ts';
import { insertOrigins, startInsert } from './insert.ts';

const PAIRS = new Map([
	['(', ')'],
	['{', '}'],
	['[', ']'],
	['\'', '\''],
	['"', '"'],
	['`', '`'],
]);
const CLOSING = new Set(PAIRS.values());

type PairAction = 'pair' | 'skip' | 'single';

// Whether typing `character` may do more than insert it.
export function isPairCharacter(character: string): boolean {
	return PAIRS.has(character) || CLOSING.has(character);
}

function isAlphanumeric(character: string): boolean {
	return /^[\p{Alphabetic}\p{N}]$/u.test(character);
}

// What typing `character` at `cursor` does.
function pairAction(
	state: EditorState,
	cursor: number,
	character: string,
): PairAction {
	const next = state.sliceDoc(cursor, cursor + 1);
	const previous = state.sliceDoc(Math.max(0, cursor - 1), cursor);
	const close = PAIRS.get(character);
	if (next === character && CLOSING.has(character)) {
		return 'skip';
	}
	if (close === undefined) {
		return 'single';
	}
	const closes = !isAlphanumeric(next)
		&& (close !== character || !isAlphanumeric(previous));
	return closes ? 'pair' : 'single';
}

interface Typed {
	action: PairAction;
	range: SelectionRange;
}

function insertion({ action, range }: Typed, character: string) {
	if (action === 'skip') {
		return [];
	}
	const close = action === 'pair' ? PAIRS.get(character) ?? '' : '';
	return [{ from: range.from, to: range.to, insert: character + close }];
}

type Origins = NonNullable<ReturnType<typeof originsOf>>;

function originsOf(state: EditorState) {
	return state.field(insertOrigins, false) ?? null;
}

// The insert-mode selections after pairing or stepping, as Helix moves
// them (`get_next_range`): the side being typed at follows the cursor, a
// one-character selection moves with it.
interface Moves {
	typed: Typed[];
	cursors: number[];
	mapPos: (position: number, assoc: -1 | 1) => number;
}

function movedOrigins(
	origins: Origins,
	{ typed, cursors, mapPos }: Moves,
): Origins {
	return origins.map((origin, index) => {
		const from = mapPos(origin.from, origin.side === 'after' ? -1 : 1);
		const to = mapPos(origin.to, 1);
		const cursor = cursors[index] ?? to;
		if (typed[index]?.action === 'single') {
			return { ...origin, from, to };
		}
		if (origin.side === 'after') {
			return { ...origin, from, to: cursor };
		}
		const isCharacter = origin.to - origin.from === 1;
		return { ...origin, from: cursor, to: isCharacter ? cursor + 1 : to };
	});
}

// Typing `text` at every cursor of insert mode.
export function typeText(state: EditorState, text: string): TransactionSpec {
	const { ranges } = state.selection;
	const typed: Typed[] = ranges.map((range) => ({
		range,
		action: text.length === 1 && range.empty
			? pairAction(state, range.head, text)
			: 'single',
	}));
	const changes = state.changes(typed.flatMap((entry) =>
		insertion(entry, text)));
	const cursors = typed.map(({ action, range }) =>
		action === 'single'
			? changes.mapPos(range.to, 1)
			: changes.mapPos(range.head, -1) + 1);
	const origins = originsOf(state);
	const hasPairs = typed.some(({ action }) => action !== 'single');
	const effects = origins && hasPairs && origins.length === ranges.length
		? startInsert.of(movedOrigins(origins, {
				typed,
				cursors,
				mapPos: (position, assoc) => changes.mapPos(position, assoc),
			}))
		: [];
	return {
		changes,
		selection: EditorSelection.create(cursors.map((cursor) =>
			EditorSelection.cursor(cursor))),
		effects,
		userEvent: 'input.type',
		scrollIntoView: true,
	};
}

// Whether the cursor sits between the two characters of an empty pair.
function isInPair(state: EditorState, range: SelectionRange): boolean {
	const before = state.sliceDoc(range.head - 1, range.head);
	const after = state.sliceDoc(range.head, range.head + 1);
	return range.empty && before !== '' && PAIRS.get(before) === after;
}

// `Backspace` in insert mode: deletes the character before each cursor, or
// both characters of an empty pair.
export function deleteBackward(state: EditorState): TransactionSpec {
	const { ranges } = state.selection;
	const changes = state.changes(ranges.map((range) => {
		if (!range.empty) {
			return { from: range.from, to: range.to };
		}
		if (isInPair(state, range)) {
			return { from: range.head - 1, to: range.head + 1 };
		}
		const line = state.doc.lineAt(range.head);
		const column = range.head - line.from;
		const from = column === 0
			? Math.max(0, range.head - 1)
			: line.from + findClusterBreak(line.text, column, false);
		return { from, to: range.head };
	}));
	const length = changes.newLength;
	const origins = originsOf(state)?.map((origin) => {
		const from = changes.mapPos(origin.from, origin.side === 'after' ? -1 : 1);
		const to = Math.max(changes.mapPos(origin.to, 1), from + 1);
		return { ...origin, from, to: Math.min(to, length) };
	});
	return {
		changes,
		selection: EditorSelection.create(ranges.map((range) =>
			EditorSelection.cursor(changes.mapPos(range.head, -1)))),
		effects: origins ? startInsert.of(origins) : [],
		userEvent: 'delete.backward',
		scrollIntoView: true,
	};
}

export const pairCommands = {
	deleteCharBackward: ({ target }) => {
		target.dispatch(deleteBackward(target.state));
	},
} satisfies Record<string, Command>;
