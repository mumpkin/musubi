// SPDX-License-Identifier: GPL-3.0-or-later
// Deletions of insert mode, as in Helix: `Ctrl-w` deletes the word before
// the cursor (and the spaces after it), `Ctrl-u` the line up to the cursor.
import type { EditorState, SelectionRange } from '@codemirror/state';

import { deletion } from './auto-pairs.ts';
import type { Command } from './context.ts';

const WHITESPACE = /[ \t]/u;
const WORD_CHARACTER = /[\p{L}\p{N}_]/u;

// Where the word before `head` starts, on its line.
function wordStart(state: EditorState, head: number): number {
	const line = state.doc.lineAt(head);
	const text = line.text;
	let column = head - line.from;
	while (column > 0 && WHITESPACE.test(text.charAt(column - 1))) {
		column -= 1;
	}
	const isWord = WORD_CHARACTER.test(text.charAt(column - 1));
	while (
		column > 0
		&& !WHITESPACE.test(text.charAt(column - 1))
		&& WORD_CHARACTER.test(text.charAt(column - 1)) === isWord
	) {
		column -= 1;
	}
	return line.from + column;
}

function deleteBefore(
	start: (state: EditorState, head: number) => number,
): Command {
	return ({ target }) => {
		const { state } = target;
		const changes = state.changes(
			state.selection.ranges.map((range: SelectionRange) => ({
				from: range.empty ? start(state, range.head) : range.from,
				to: range.empty ? range.head : range.to,
			})),
		);
		target.dispatch(deletion(state, changes));
	};
}

export const insertDeleteCommands = {
	deleteWordBackward: deleteBefore(wordStart),
	deleteToLineStart: deleteBefore(
		(state, head) => state.doc.lineAt(head).from,
	),
} satisfies Record<string, Command>;
