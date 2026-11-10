// SPDX-License-Identifier: GPL-3.0-or-later
// Replays Helix key sequences on a `TestEditor`, and marks its selections
// the way the reference recorder marks those of the real Helix.
import { EditorSelection } from '@codemirror/state';

import { selectMatches } from './editing.ts';
import { resolveKey } from './keymap.ts';
import { cursorOf } from './selection.ts';
import type { TestEditor } from './test-editor.ts';

const ESCAPE = '\u001B';
const ENTER = '\r';
const SEQUENCE_LENGTH = 2;

function typeText(editor: TestEditor, text: string): void {
	const { state } = editor;
	const changes = state.changes(state.selection.ranges.map((range) => ({
		from: range.from,
		to: range.to,
		insert: text,
	})));
	const ranges = state.selection.ranges.map((range) => {
		const position = changes.mapPos(range.to);
		return EditorSelection.cursor(position);
	});
	editor.dispatch({ changes, selection: EditorSelection.create(ranges) });
}

// Applies one key; returns how many keys were consumed (a prompt takes the
// keys up to Enter, a sequence such as `gh` two keys).
function pressKey(editor: TestEditor, keys: string, index: number): number {
	const key = keys.charAt(index) === ESCAPE ? 'Escape' : keys.charAt(index);
	const prefix = resolveKey(editor.mode, '', key);
	if (prefix.pending !== undefined) {
		const next = keys.charAt(index + 1);
		const second = resolveKey(editor.mode, prefix.pending, next);
		if (second.command !== undefined) {
			editor.run(second.command);
		}
		return SEQUENCE_LENGTH;
	}
	const name = prefix.command;
	if (name === 'selectPrompt') {
		const end = keys.indexOf(ENTER, index);
		selectMatches(editor, keys.slice(index + 1, end));
		return end - index + 1;
	}
	if (name !== undefined) {
		editor.run(name);
	} else if (editor.mode === 'insert') {
		typeText(editor, key);
	}
	return 1;
}

export function replayKeys(editor: TestEditor, keys: string): void {
	let index = 0;
	while (index < keys.length) {
		index += pressKey(editor, keys, index);
	}
}

// The text with `marker` inserted at each position.
function insertMarkers(text: string, positions: number[], marker: string) {
	return [...new Set(positions)]
		.sort((left, right) => right - left)
		.reduce(
			(marked, position) =>
				marked.slice(0, position) + marker + marked.slice(position),
			text,
		);
}

export function markSelections(editor: TestEditor): {
	starts: string;
	ends: string;
	cursors: string;
} {
	const { ranges } = editor.state.selection;
	return {
		starts: insertMarkers(editor.text, ranges.map((range) => range.from), '['),
		ends: insertMarkers(editor.text, ranges.map((range) => range.to), ']'),
		cursors: insertMarkers(editor.text, ranges.map(cursorOf), '|'),
	};
}
