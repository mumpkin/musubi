// SPDX-License-Identifier: GPL-3.0-or-later
// The paragraph text object (`mip`, `map`), ported line by line from
// `textobject_paragraph` in Helix, quirks included: on a blank line it
// takes a neighbouring paragraph. Lines are counted as in Ropey: the text
// after the last line break is one more, empty, line.
import type { EditorState } from '@codemirror/state';

import type { Span } from './text.ts';
import type { ObjectSide } from './textobjects.ts';

interface Lines {
	// Whether line `index` (from 0) is only a line break.
	isBlank: (index: number) => boolean;
	count: number;
	start: (index: number) => number;
}

function linesOf(state: EditorState): Lines {
	const text = state.doc.toString();
	const breaks = [...text.matchAll(/\n/gu)].map((match) => match.index);
	const starts = [0, ...breaks.map((position) => position + 1)];
	return {
		count: starts.length,
		start: (index) => starts[index] ?? text.length,
		isBlank: (index) => {
			const from = starts[index] ?? text.length;
			const to = starts[index + 1] ?? text.length;
			return text.slice(from, to) === '\n';
		},
	};
}

// Moves back over blank lines, then over the lines of a paragraph.
function backOverParagraph(lines: Lines, line: number): number {
	let index = line;
	while (index > 0 && lines.isBlank(index - 1)) {
		index -= 1;
	}
	while (index > 0 && !lines.isBlank(index - 1)) {
		index -= 1;
	}
	return index;
}

// Moves forward over a paragraph, then over the blank lines after it.
function forwardOverParagraph(lines: Lines, line: number) {
	let index = line;
	let isDone = false;
	while (index < lines.count && !lines.isBlank(index)) {
		index += 1;
		isDone = true;
	}
	while (index < lines.count && lines.isBlank(index)) {
		index += 1;
	}
	return { index, isDone };
}

function paragraphStart(
	lines: Lines,
	line: number,
	{ startsAfter, isAtEnd }: { startsAfter: boolean; isAtEnd: boolean },
): number {
	const back = startsAfter ? line + 1 : line;
	return isAtEnd ? back : backOverParagraph(lines, back);
}

// Blank lines after a paragraph, which `mip` leaves out.
function withoutTrailingBlanks(lines: Lines, end: number): number {
	let index = end;
	while (index > 0 && lines.isBlank(index - 1)) {
		index -= 1;
	}
	return index;
}

// Where the cursor stands relative to the blank lines around it.
function cursorPlace(lines: Lines, line: number, cursor: number) {
	const previousBlank = lines.isBlank(Math.max(line - 1, 0));
	const currentBlank = lines.isBlank(line);
	// Helix reads the previous line for the next one too.
	const nextBlank = previousBlank;
	const blankToText = currentBlank && !nextBlank;
	const isLastCharacter = cursor === lines.start(line + 1) - 1;
	return {
		startsAfter: (previousBlank && !currentBlank) || blankToText,
		isAtEnd: blankToText && isLastCharacter,
	};
}

export function paragraphObject(
	state: EditorState,
	cursor: number,
	side: ObjectSide,
): Span {
	const lines = linesOf(state);
	const line = state.doc.lineAt(cursor).number - 1;
	const place = cursorPlace(lines, line, cursor);
	let start = paragraphStart(lines, line, place);
	const first = place.isAtEnd ? line + 1 : line;
	const forward = forwardOverParagraph(lines, first);
	if (!forward.isDone && forward.index >= lines.count) {
		start = backOverParagraph(lines, start);
	}
	const end = side === 'inside'
		? withoutTrailingBlanks(lines, forward.index)
		: forward.index;
	return { anchor: lines.start(start), head: lines.start(end) };
}
