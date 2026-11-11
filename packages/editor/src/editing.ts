// SPDX-License-Identifier: GPL-3.0-or-later
// Commands that change the text or the clipboard.
import { redo, undo } from '@codemirror/commands';
import {
	EditorSelection,
	type EditorState,
	type SelectionRange,
} from '@codemirror/state';

import {
	type Command,
	type CommandContext,
	type CommandTarget,
} from './context.ts';
import { copySelectionOnNextLine } from './copy-selection.ts';
import { enterInsertMode } from './modes.ts';
import { asCharacters, withCharacters } from './selection.ts';

function selectedTexts(state: EditorState): string[] {
	return state.selection.ranges.map((range) => {
		const { from, to } = asCharacters(state, range);
		return state.sliceDoc(from, to);
	});
}

// After a deletion, each selection becomes the character that follows it.
// Deleted and yanked text goes to the system clipboard, so that it can be
// pasted in other applications (Helix keeps it in a register).
function store(context: CommandContext, text: string): void {
	context.register.text = text;
	context.host.clipboard.write(text).catch(() => undefined);
}

function deleteSelections(context: CommandContext): void {
	const { target } = context;
	const { state } = target;
	store(context, selectedTexts(state).join('\n'));
	const changes = state.changes(
		state.selection.ranges.map((range) => asCharacters(state, range)),
	);
	const cursors = state.selection.ranges.map((range) =>
		EditorSelection.cursor(changes.mapPos(range.from)),
	);
	target.dispatch({
		changes,
		selection: EditorSelection.create(cursors, state.selection.mainIndex),
	});
	target.dispatch({ selection: withCharacters(target.state) });
}

function yank(context: CommandContext): void {
	store(context, selectedTexts(context.target.state).join('\n'));
}

export type PasteSide = 'before' | 'after';

// Where `text` goes for a selection. Text that ends with a line break is
// pasted as whole lines: before the first line or after the last one.
function pastePosition(
	state: EditorState,
	range: SelectionRange,
	{ text, side }: { text: string; side: PasteSide },
): number {
	const { from, to } = asCharacters(state, range);
	if (!text.endsWith('\n')) {
		return side === 'before' ? from : to;
	}
	if (side === 'before') {
		return state.doc.lineAt(from).from;
	}
	const lastLine = state.doc.lineAt(Math.max(from, to - 1));
	return Math.min(lastLine.to + 1, state.doc.length);
}

// Inserts `text` before or after every selection and selects it.
export function pasteText(
	target: CommandTarget,
	text: string,
	side: PasteSide,
): void {
	const { state } = target;
	const positions = state.selection.ranges.map(
		(range) => pastePosition(state, range, { text, side }),
	);
	const changes = state.changes(
		positions.map((position) => ({ from: position, insert: text })),
	);
	const ranges = positions.map((position) => {
		const start = changes.mapPos(position, -1);
		return EditorSelection.range(start, start + text.length);
	});
	target.dispatch({
		changes,
		selection: EditorSelection.create(ranges, state.selection.mainIndex),
	});
}

// The system clipboard first; the register if it cannot be read or is
// empty.
function paste(side: PasteSide): Command {
	return (context) => {
		context.host.clipboard
			.read()
			.catch(() => '')
			.then((text) => {
				pasteText(context.target, text || context.register.text, side);
			})
			.catch(() => undefined);
	};
}

// `s`: selects every match of `pattern` inside the selections.
export function selectMatches(target: CommandTarget, pattern: string): void {
	const { state } = target;
	let expression: RegExp;
	try {
		expression = new RegExp(pattern, 'gu');
	} catch {
		return;
	}
	const ranges = state.selection.ranges.flatMap((range) => {
		const text = state.sliceDoc(range.from, range.to);
		return [...text.matchAll(expression)]
			.filter((match) => match[0].length > 0)
			.map((match) => EditorSelection.range(
				range.from + match.index,
				range.from + match.index + match[0].length,
			));
	});
	if (ranges.length > 0) {
		target.dispatch({ selection: EditorSelection.create(ranges) });
	}
}

export const editingCommands = {
	delete: deleteSelections,
	// `c`: deletes, then types before the character that follows.
	change: (context) => {
		deleteSelections(context);
		enterInsertMode(context.target, 'before');
	},
	yank,
	paste: paste('after'),
	pasteBefore: paste('before'),
	undo: ({ target }) => {
		undo(target);
		target.dispatch({ selection: withCharacters(target.state) });
	},
	redo: ({ target }) => {
		redo(target);
		target.dispatch({ selection: withCharacters(target.state) });
	},
	copySelectionOnNextLine,
} satisfies Record<string, Command>;
