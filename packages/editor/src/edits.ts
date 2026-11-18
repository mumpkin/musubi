// SPDX-License-Identifier: GPL-3.0-or-later
// Changes of the selected text that keep the selection: `r` replaces each
// character, `~` switches the case, `J` joins lines.
import {
	type ChangeSpec,
	EditorSelection,
	type EditorState,
	type SelectionRange,
} from '@codemirror/state';

import type { Command, CommandTarget } from './context.ts';
import { cursorOf } from './selection.ts';

// Replaces the text of each range with `rewrite` of it, keeping each range
// over its new text, in its direction.
function rewriteRanges(
	target: CommandTarget,
	rewrite: (text: string) => string,
): void {
	const { state } = target;
	const { ranges, mainIndex } = state.selection;
	const changes = state.changes(ranges.map((range) => ({
		from: range.from,
		to: range.to,
		insert: rewrite(state.sliceDoc(range.from, range.to)),
	})));
	const selection = EditorSelection.create(
		ranges.map((range) => {
			const from = changes.mapPos(range.from, -1);
			const to = changes.mapPos(range.to, 1);
			return range.head < range.anchor
				? EditorSelection.range(to, from)
				: EditorSelection.range(from, to);
		}),
		mainIndex,
	);
	target.dispatch({ changes, selection });
}

const switchCharacter = (character: string): string => {
	const upper = character.toUpperCase();
	return character === upper ? character.toLowerCase() : upper;
};

// The changes that join the lines of `range` into one, as Helix does: the
// line break and the indentation after it become one space, or nothing
// before an empty line. A range on one line joins it with the next.
function joinChanges(state: EditorState, range: SelectionRange): ChangeSpec[] {
	const first = state.doc.lineAt(range.from).number;
	const last = state.doc.lineAt(cursorOf(range)).number;
	const end = Math.min(Math.max(last, first + 1), state.doc.lines);
	const changes: ChangeSpec[] = [];
	for (let number = first; number < end; number += 1) {
		const line = state.doc.line(number);
		const next = state.doc.line(number + 1);
		const indentation = next.text.length - next.text.trimStart().length;
		changes.push({
			from: line.to,
			to: next.from + indentation,
			insert: next.text.trim() === '' ? '' : ' ',
		});
	}
	return changes;
}

export const editCommands = {
	// `r` and a character: replaces every selected character with it.
	replaceCharacters: ({ target }, argument = '') => {
		if (argument !== '') {
			rewriteRanges(target, (text) =>
				Array.from(text, () => argument).join(''));
		}
	},
	// `~`: switches the case of every selected character.
	switchCase: ({ target }) => {
		rewriteRanges(target, (text) =>
			Array.from(text, switchCharacter).join(''));
	},
	// `J`: joins the lines of each selection.
	joinLines: ({ target }) => {
		const { state } = target;
		const changes = state.selection.ranges
			.flatMap((range) => joinChanges(state, range));
		target.dispatch({ changes });
	},
} satisfies Record<string, Command>;
