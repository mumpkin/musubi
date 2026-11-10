// SPDX-License-Identifier: GPL-3.0-or-later
// Commands that change the text or the clipboard.
import { redo, undo } from '@codemirror/commands';
import { EditorSelection, type EditorState } from '@codemirror/state';

import {
	type Command,
	type CommandContext,
	type CommandTarget,
} from './context.ts';
import { enterInsertMode } from './modes.ts';
import { asCharacters, withCharacters } from './selection.ts';

function selectedTexts(state: EditorState): string[] {
	return state.selection.ranges.map((range) => {
		const { from, to } = asCharacters(state, range);
		return state.sliceDoc(from, to);
	});
}

// After a deletion, each selection becomes the character that follows it.
function deleteSelections(context: CommandContext): void {
	const { target } = context;
	const { state } = target;
	context.register.text = selectedTexts(state).join('\n');
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
	const text = selectedTexts(context.target.state).join('\n');
	context.register.text = text;
	context.host.clipboard.write(text).catch(() => undefined);
}

// Inserts `text` after every selection and selects what was inserted.
export function pasteAfter(target: CommandTarget, text: string): void {
	const { state } = target;
	const positions = state.selection.ranges.map(
		(range) => asCharacters(state, range).to,
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

// The system clipboard first; the register if it cannot be read (the
// webview may refuse) or is empty.
function paste(context: CommandContext): void {
	context.host.clipboard
		.read()
		.catch(() => '')
		.then((text) => {
			pasteAfter(context.target, text || context.register.text);
		})
		.catch(() => undefined);
}

// `C`: the same columns on the next line long enough to hold them.
function copySelectionOnNextLine({ target }: CommandContext): void {
	const { state } = target;
	const main = state.selection.main;
	const line = state.doc.lineAt(main.from);
	const anchorColumn = main.anchor - state.doc.lineAt(main.anchor).from;
	const headColumn = main.head - state.doc.lineAt(main.head).from;
	const width = Math.max(anchorColumn, headColumn);
	for (let number = line.number + 1; number <= state.doc.lines; number += 1) {
		const next = state.doc.line(number);
		if (next.length >= width) {
			const range = EditorSelection.range(
				next.from + anchorColumn,
				next.from + headColumn,
			);
			target.dispatch({ selection: state.selection.addRange(range) });
			return;
		}
	}
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
	paste,
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
