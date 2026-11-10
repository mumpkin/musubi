// SPDX-License-Identifier: GPL-3.0-or-later
// Commands that switch modes or open the command line.
import { EditorSelection } from '@codemirror/state';

import { changeMode, type Command, type CommandTarget } from './context.ts';
import {
	insertCursors,
	insertOrigins,
	type InsertSide,
	restoredSelection,
	startInsert,
} from './insert.ts';
import {
	asCharacters,
	characterAt,
	cursorOf,
	mapRanges,
	toRange,
	withCharacters,
} from './selection.ts';

export function enterInsertMode(target: CommandTarget, side: InsertSide): void {
	const { state } = target;
	const origins = state.selection.ranges.map((range) => ({
		...asCharacters(state, range),
		side,
	}));
	target.dispatch({
		selection: insertCursors(origins),
		effects: startInsert.of(origins),
	});
	changeMode(target, 'insert');
}

function insertAt(side: InsertSide): Command {
	return ({ target }) => {
		enterInsertMode(target, side);
	};
}

// Back to normal mode, with the selections of insert mode restored, or
// one-character selections.
function normalMode({ target }: Parameters<Command>[0]): void {
	const { state } = target;
	const origins = state.field(insertOrigins, false);
	const selection = origins
		? restoredSelection(origins)
		: withCharacters(state);
	target.dispatch({ selection, effects: startInsert.of(null) });
	changeMode(target, 'normal');
}

// `o` and `O`: a new line below or above each cursor's line, with the same
// indentation, typed into in insert mode.
function openLine(side: 'below' | 'above'): Command {
	return ({ target }) => {
		const { state } = target;
		const lines = state.selection.ranges.map((range) =>
			state.doc.lineAt(cursorOf(range)));
		const insertions = lines.map((line) => {
			const indentation = /^[ \t]*/u.exec(line.text)?.[0] ?? '';
			return side === 'below'
				? { from: line.to, insert: `\n${indentation}` }
				: { from: line.from, insert: `${indentation}\n` };
		});
		const changes = state.changes(insertions);
		const cursors = insertions.map((insertion) => {
			const end = changes.mapPos(insertion.from, 1);
			const position = side === 'below' ? end : end - 1;
			return EditorSelection.cursor(position);
		});
		target.dispatch({
			changes,
			selection: EditorSelection.create(cursors),
		});
		enterInsertMode(target, 'before');
	};
}

export const modeCommands = {
	openBelow: openLine('below'),
	openAbove: openLine('above'),
	insertMode: insertAt('before'),
	appendMode: insertAt('after'),
	selectMode: ({ target }) => {
		changeMode(target, 'select');
	},
	normalMode,
	// `;`: keep only the character under each cursor.
	collapseSelection: ({ target }) => {
		const { state } = target;
		const selection = mapRanges(state, (range) =>
			toRange(characterAt(state, cursorOf(range))),
		);
		target.dispatch({ selection });
	},
	commandLine: ({ host }) => {
		host.openPrompt('command');
	},
	selectPrompt: ({ host }) => {
		host.openPrompt('select');
	},
	write: ({ host }) => {
		host.write().catch(() => undefined);
	},
	quit: ({ host }) => {
		host.quit(false);
	},
	forceQuit: ({ host }) => {
		host.quit(true);
	},
} satisfies Record<string, Command>;
