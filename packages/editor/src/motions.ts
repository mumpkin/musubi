// SPDX-License-Identifier: GPL-3.0-or-later
// Motion commands. A motion replaces the selection in normal mode and
// extends it in select mode.
import type { EditorState, Line, SelectionRange } from '@codemirror/state';

import { type Command, currentMode } from './context.ts';
import {
	characterAt,
	cursorOf,
	extend,
	mapRanges,
	toRange,
} from './selection.ts';
import {
	nextWordEnd,
	nextWordStart,
	previousWordStart,
	type Span,
} from './text.ts';

type Motion = (state: EditorState, range: SelectionRange) => Span;

function motion(move: Motion): Command {
	return ({ target }) => {
		const { state } = target;
		const isSelecting = currentMode(state) === 'select';
		const selection = mapRanges(state, (range) => {
			const span = move(state, range);
			return isSelecting ? extend(range, span) : toRange(span);
		});
		target.dispatch({ selection, scrollIntoView: true });
	};
}

function byCharacter(step: number): Motion {
	return (state, range) => characterAt(state, cursorOf(range) + step);
}

function byLine(step: number): Motion {
	return (state, range) => {
		const cursor = cursorOf(range);
		const line = state.doc.lineAt(cursor);
		const targetNumber = line.number + step;
		if (targetNumber < 1 || targetNumber > state.doc.lines) {
			return characterAt(state, cursor);
		}
		const targetLine = state.doc.line(targetNumber);
		const column = Math.min(cursor - line.from, targetLine.length);
		return characterAt(state, targetLine.from + column);
	};
}

function byWord(move: (text: string, cursor: number) => Span): Motion {
	return (state, range) => move(state.doc.toString(), cursorOf(range));
}

function coversWholeLines(state: EditorState, range: SelectionRange): boolean {
	const first = state.doc.lineAt(range.from);
	const last = state.doc.lineAt(Math.max(range.from, range.to - 1));
	const end = Math.min(last.to + 1, state.doc.length);
	return range.from === first.from && range.to === end && !range.empty;
}

// `x`: the whole line, or one more line if whole lines are selected.
const selectLine: Motion = (state, range) => {
	const first = state.doc.lineAt(range.from);
	const isExtending
		= coversWholeLines(state, range) && range.to < state.doc.length;
	const last = state.doc.lineAt(
		isExtending ? range.to : Math.max(range.from, range.to - 1),
	);
	const head = Math.min(last.to + 1, state.doc.length);
	return { anchor: first.from, head };
};

function lineTarget(position: (line: Line) => number): Motion {
	return (state, range) => {
		const line = state.doc.lineAt(cursorOf(range));
		return characterAt(state, position(line));
	};
}

// `gl`: the last character of the line, or the line break of an empty line.
const lineEnd = lineTarget((line) => line.from + Math.max(line.length - 1, 0));

// `gs`: the first character that is not a space or a tab.
const firstNonWhitespace = lineTarget(
	(line) => line.from + line.length - line.text.trimStart().length,
);

export const motionCommands = {
	moveCharLeft: motion(byCharacter(-1)),
	moveCharRight: motion(byCharacter(1)),
	moveLineDown: motion(byLine(1)),
	moveLineUp: motion(byLine(-1)),
	gotoLineStart: motion(lineTarget((line) => line.from)),
	gotoLineEnd: motion(lineEnd),
	gotoFirstNonWhitespace: motion(firstNonWhitespace),
	moveNextWordStart: motion(byWord(nextWordStart)),
	moveNextWordEnd: motion(byWord(nextWordEnd)),
	movePreviousWordStart: motion(byWord(previousWordStart)),
	extendLineBelow: ({ target }) => {
		const { state } = target;
		const selection = mapRanges(
			state,
			(range) => toRange(selectLine(state, range)),
		);
		target.dispatch({ selection, scrollIntoView: true });
	},
} satisfies Record<string, Command>;
