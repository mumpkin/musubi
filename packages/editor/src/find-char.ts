// SPDX-License-Identifier: GPL-3.0-or-later
// Selecting by character: `f` and `t` select up to the next occurrence of
// a character (`f` with it, `t` before it), `F` and `T` up to the previous
// one, across lines as in Helix; `%` selects the whole text and `,` keeps
// only the main selection.
import { EditorSelection } from '@codemirror/state';

import type { Command } from './context.ts';
import { type Motion, motion } from './motions.ts';
import { cursorOf } from './selection.ts';

type Direction = 'forward' | 'backward';

// From the cursor to the occurrence of `character`, with it (`isOn`) or
// stopping next to it; the selection stays if there is none.
function findMotion(
	character: string,
	direction: Direction,
	isOn: boolean,
): Motion {
	return (state, range) => {
		const cursor = cursorOf(range);
		const text = state.doc.toString();
		if (direction === 'forward') {
			const found = text.indexOf(character, cursor + 1);
			return found === -1
				? { anchor: range.anchor, head: range.head }
				: { anchor: cursor, head: isOn ? found + 1 : found };
		}
		const found = text.lastIndexOf(character, cursor - 1);
		return found === -1
			? { anchor: range.anchor, head: range.head }
			: { anchor: cursor + 1, head: isOn ? found : found + 1 };
	};
}

function find(direction: Direction, isOn: boolean): Command {
	return (context, argument = '') => {
		if (argument !== '') {
			motion(findMotion(argument, direction, isOn))(context);
		}
	};
}

export const findCommands = {
	findNextCharacter: find('forward', true),
	tillNextCharacter: find('forward', false),
	findPreviousCharacter: find('backward', true),
	tillPreviousCharacter: find('backward', false),
	selectAll: ({ target }) => {
		const { length } = target.state.doc;
		target.dispatch({ selection: EditorSelection.single(0, length) });
	},
	keepPrimarySelection: ({ target }) => {
		const { main } = target.state.selection;
		target.dispatch({ selection: EditorSelection.create([main]) });
	},
} satisfies Record<string, Command>;
