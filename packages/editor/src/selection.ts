// SPDX-License-Identifier: GPL-3.0-or-later
// Selection helpers. In normal and select modes every selection covers at
// least one character, as in Helix: the block cursor is the character at
// the head end of the selection.
import {
	EditorSelection,
	type EditorState,
	type SelectionRange,
} from '@codemirror/state';

import type { Span } from './text.ts';

// Character under the block cursor of `range`.
export function cursorOf(range: SelectionRange): number {
	return range.head > range.anchor ? range.head - 1 : range.head;
}

// Whether the cursor may sit at the very end of the text. As in Helix, it
// can after a final line break: on the empty last line.
function acceptsEndCursor(state: EditorState): boolean {
	const length = state.doc.length;
	return length === 0 || state.sliceDoc(length - 1) === '\n';
}

// Selection of the single character at `position`, kept inside the text.
// At the end of the text the selection is empty.
export function characterAt(state: EditorState, position: number): Span {
	const length = state.doc.length;
	const last = acceptsEndCursor(state) ? length : length - 1;
	const anchor = Math.max(0, Math.min(position, last));
	return { anchor, head: Math.min(anchor + 1, length) };
}

// Empty selections become one-character selections, as normal mode needs.
export function withCharacters(state: EditorState): EditorSelection {
	return mapRanges(state, (range) =>
		range.empty ? toRange(characterAt(state, range.head)) : range,
	);
}

// `range`, widened to one character if it is empty.
export function asCharacters(
	state: EditorState,
	range: SelectionRange,
): { from: number; to: number } {
	if (!range.empty) {
		return { from: range.from, to: range.to };
	}
	const span = characterAt(state, range.head);
	return { from: span.anchor, to: span.head };
}

export function toRange(span: Span): SelectionRange {
	return EditorSelection.range(span.anchor, span.head);
}

// In select mode, motions move the cursor and keep the anchor. As in Helix
// (`Range::put_cursor`), when the cursor crosses the anchor, the anchor
// moves by one character so that the character it was on stays selected.
export function extend(range: SelectionRange, span: Span): SelectionRange {
	const cursor = span.head > span.anchor ? span.head - 1 : span.head;
	let { anchor } = range;
	if (range.head >= range.anchor && cursor < range.anchor) {
		anchor += 1;
	} else if (range.head < range.anchor && cursor >= range.anchor) {
		anchor -= 1;
	}
	const head = anchor <= cursor ? cursor + 1 : cursor;
	return EditorSelection.range(anchor, head);
}

export function mapRanges(
	state: EditorState,
	transform: (range: SelectionRange) => SelectionRange,
): EditorSelection {
	const { ranges, mainIndex } = state.selection;
	return EditorSelection.create(ranges.map(transform), mainIndex);
}
