// SPDX-License-Identifier: GPL-3.0-or-later
// `>` and `<`: indent or unindent the lines of every selection by one
// unit, as in Helix. Empty lines stay empty.
import { getIndentUnit } from '@codemirror/language';
import {
	type ChangeSpec,
	EditorSelection,
	type EditorState,
	type Line,
} from '@codemirror/state';

import type { Command, CommandTarget } from './context.ts';

// The lines that the selections cover, each once, top to bottom.
function selectedLines(state: EditorState): Line[] {
	const numbers = new Set<number>();
	for (const range of state.selection.ranges) {
		const first = state.doc.lineAt(range.from).number;
		const end = Math.max(range.from, range.to - 1);
		const last = state.doc.lineAt(end).number;
		for (let number = first; number <= last; number += 1) {
			numbers.add(number);
		}
	}
	return [...numbers].sort((left, right) => left - right)
		.map((number) => state.doc.line(number));
}

// Leading whitespace of `line` that one unindent removes: up to one unit,
// a tab counting as a whole unit.
function outdentLength(line: Line, unit: number): number {
	let length = 0;
	let width = 0;
	for (const character of line.text) {
		if (width >= unit || (character !== ' ' && character !== '\t')) {
			break;
		}
		width += character === '\t' ? unit : 1;
		length += 1;
	}
	return length;
}

// Applies `changes`; a selection pushed past the text it covered keeps at
// least one character, as selections do in normal mode.
function applyChanges(target: CommandTarget, changes: ChangeSpec[]): void {
	const { state } = target;
	const set = state.changes(changes);
	const ranges = state.selection.ranges.map((range) => {
		const mapped = range.map(set, 1);
		const end = Math.min(mapped.from + 1, set.newLength);
		return mapped.empty ? EditorSelection.range(mapped.from, end) : mapped;
	});
	target.dispatch({
		changes: set,
		selection: EditorSelection.create(ranges, state.selection.mainIndex),
	});
}

const indent: Command = ({ target }) => {
	const { state } = target;
	const unit = ' '.repeat(getIndentUnit(state));
	applyChanges(target, selectedLines(state)
		.filter((line) => line.length > 0)
		.map((line) => ({ from: line.from, insert: unit })));
};

const unindent: Command = ({ target }) => {
	const { state } = target;
	const unit = getIndentUnit(state);
	applyChanges(target, selectedLines(state).map((line) => ({
		from: line.from,
		to: line.from + outdentLength(line, unit),
	})));
};

export const indentCommands = { indent, unindent } satisfies Record<
	string,
	Command
>;
