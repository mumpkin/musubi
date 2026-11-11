// SPDX-License-Identifier: GPL-3.0-or-later
// Moves across the file and the screen: `gg`, `ge`, `G`, `zz`, `zt`, `zb`,
// `Ctrl-d`, `Ctrl-u`, `Ctrl-f`, `Ctrl-b`, as in Helix.
import type { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { type Command, type CommandContext, currentMode } from './context.ts';
import { byLine, motion } from './motions.ts';
import {
	characterAt,
	cursorOf,
	extend,
	mapRanges,
	toRange,
} from './selection.ts';

// Lines on screen when there is no view (tests).
const DEFAULT_VISIBLE_LINES = 20;
// Lines kept visible around the cursor, as `scrolloff` in Helix.
export const SCROLL_OFF_LINES = 5;

// Number (from 1) of the last line; a final line break ends the last line
// rather than starting an empty one.
function lastLine(state: EditorState): number {
	const { doc } = state;
	const isEmptyLast = doc.lines > 1 && doc.line(doc.lines).length === 0;
	return isEmptyLast ? doc.lines - 1 : doc.lines;
}

// The start of line `number`, kept inside the text.
function lineStart(number: number): Command {
	return motion((state) => {
		const line = Math.min(Math.max(number, 1), lastLine(state));
		return characterAt(state, state.doc.line(line).from);
	});
}

// `gg`: the first line, or line `count`.
function gotoFileStart(context: CommandContext): void {
	lineStart(context.count ?? 1)(context);
}

// `G`: line `count`; nothing without a count.
function gotoLine(context: CommandContext): void {
	if (context.count !== undefined) {
		lineStart(context.count)(context);
	}
}

// `ge`: the last line.
function gotoLastLine(context: CommandContext): void {
	lineStart(lastLine(context.target.state))(context);
}

// Moves the cursors by a part of the screen and scrolls by as much, so
// that they stay at the same place on screen.
function page(fraction: number): Command {
	return (context) => {
		const { target } = context;
		const visible = target.scroller?.visibleLines()
			?? DEFAULT_VISIBLE_LINES;
		const lines = Math.trunc(visible * fraction) || Math.sign(fraction);
		const move = byLine(lines);
		const { state } = target;
		const isSelecting = currentMode(state) === 'select';
		const selection = mapRanges(state, (range) => {
			const span = move(state, range);
			return isSelecting ? extend(range, span) : toRange(span);
		});
		target.dispatch({ selection });
		target.scroller?.scrollByLines(lines);
	};
}

// `zz`, `zt`, `zb`: scrolls so that the cursor line is in the middle, at
// the top or at the bottom of the screen.
function align(position: 'center' | 'start' | 'end'): Command {
	return ({ target }) => {
		const { state } = target;
		const cursor = cursorOf(state.selection.main);
		target.dispatch({
			// `y` is the name of the CodeMirror option.
			// eslint-disable-next-line id-length
			effects: EditorView.scrollIntoView(cursor, { y: position }),
		});
	};
}

const HALF = 0.5;

export const navigationCommands = {
	gotoFileStart,
	gotoLine,
	gotoLastLine,
	pageCursorHalfDown: page(HALF),
	pageCursorHalfUp: page(-HALF),
	pageDown: page(1),
	pageUp: page(-1),
	alignViewCenter: align('center'),
	alignViewTop: align('start'),
	alignViewBottom: align('end'),
} satisfies Record<string, Command>;
