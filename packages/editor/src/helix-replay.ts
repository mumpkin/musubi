// SPDX-License-Identifier: GPL-3.0-or-later
// Replays Helix key sequences on a `TestEditor`, and marks its selections
// the way the reference recorder marks those of the real Helix.
import { typeText } from './auto-pairs.ts';
import { selectMatches } from './editing.ts';
import { pressJumpLabel } from './jump-labels.ts';
import { resolveKey } from './keymap.ts';
import { cursorOf } from './selection.ts';
import type { TestEditor } from './test-editor.ts';

const ESCAPE = '\u001B';
const ENTER = '\r';
const BACKSPACE = '\u007F';
const KEY_NAMES = new Map([
	[ESCAPE, 'Escape'],
	[BACKSPACE, 'Backspace'],
]);
// Marks that the `s` prompt is open.
const PROMPT = '\u0000prompt';

// Applies one key, like the key handler of the editor. `pending` holds the
// keys of a sequence being typed.
function pressKey(
	editor: TestEditor,
	key: string,
	pending: { keys: string },
): void {
	if (pressJumpLabel(editor, key)) {
		return;
	}
	const resolution = resolveKey(editor.mode, pending.keys, key);
	pending.keys = resolution.pending ?? '';
	if (resolution.command === 'selectPrompt') {
		pending.keys = PROMPT;
	} else if (resolution.command !== undefined) {
		editor.runWith(resolution.command, resolution.argument ?? '');
	} else if (resolution.pending === undefined && editor.mode === 'insert') {
		editor.dispatch(typeText(editor.state, key));
	}
}

export function replayKeys(editor: TestEditor, keys: string): void {
	const pending = { keys: '' };
	let index = 0;
	while (index < keys.length) {
		const key = KEY_NAMES.get(keys.charAt(index)) ?? keys.charAt(index);
		index += 1;
		if (pending.keys === PROMPT) {
			// `s` reads a regex up to Enter.
			const end = keys.indexOf(ENTER, index - 1);
			selectMatches(editor, keys.slice(index - 1, end));
			index = end + 1;
			pending.keys = '';
		} else {
			pressKey(editor, key, pending);
		}
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
