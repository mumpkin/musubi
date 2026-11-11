// SPDX-License-Identifier: GPL-3.0-or-later
// `C`: copies each selection onto the next line long enough to hold its
// columns, as `copy_selection_on_line` in Helix. Columns are those of the
// first and last selected characters.
import {
	EditorSelection,
	type EditorState,
	type SelectionRange,
} from '@codemirror/state';

import type { CommandContext } from './context.ts';

interface Corner {
	line: number;
	column: number;
}

function corner(state: EditorState, position: number): Corner {
	const line = state.doc.lineAt(position);
	return { line: line.number, column: position - line.from };
}

// Position at `column` of line `number`, if the line reaches it (its line
// break counts as a column).
function positionAt(state: EditorState, { line, column }: Corner) {
	const found = state.doc.line(line);
	return column <= found.length ? found.from + column : undefined;
}

// The range from `anchor` with the cursor on `head`, as `put_cursor`.
function rangeOver(anchor: number, head: number): SelectionRange {
	return head < anchor
		? EditorSelection.range(anchor + 1, head)
		: EditorSelection.range(anchor, head + 1);
}

function copyBelow(
	state: EditorState,
	range: SelectionRange,
): SelectionRange | undefined {
	const isForward = range.anchor < range.head;
	const head = corner(state, isForward ? range.head - 1 : range.head);
	const anchor = corner(
		state,
		isForward ? range.anchor : Math.max(0, range.anchor - 1),
	);
	const height = Math.abs(head.line - anchor.line) + 1;
	for (let offset = height; ; offset += height) {
		const lines = {
			anchor: anchor.line + offset,
			head: head.line + offset,
		};
		if (Math.max(lines.anchor, lines.head) > state.doc.lines) {
			return undefined;
		}
		const from = positionAt(state, { ...anchor, line: lines.anchor });
		const to = positionAt(state, { ...head, line: lines.head });
		if (from !== undefined && to !== undefined) {
			return rangeOver(from, to);
		}
	}
}

export function copySelectionOnNextLine({ target }: CommandContext): void {
	const { state } = target;
	const { ranges, mainIndex } = state.selection;
	const copies = ranges.map((range) => copyBelow(state, range));
	const all = [...ranges];
	let main = mainIndex;
	copies.forEach((copy, index) => {
		if (copy) {
			if (index === mainIndex) {
				main = all.length;
			}
			all.push(copy);
		}
	});
	target.dispatch({ selection: EditorSelection.create(all, main) });
}
