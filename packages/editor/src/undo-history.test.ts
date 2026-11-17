// SPDX-License-Identifier: GPL-3.0-or-later
import { undoDepth } from '@codemirror/commands';
import { Transaction } from '@codemirror/state';
import { describe, expect, it } from 'vitest';

import { typeText } from './auto-pairs.ts';
import { replayKeys } from './helix-replay.ts';
import { TestEditor } from './test-editor.ts';

const MINUTE = 60_000;

// Types `text` in insert mode, as if at `time` (milliseconds).
function typeAt(editor: TestEditor, text: string, time: number): void {
	editor.dispatch({
		...typeText(editor.state, text),
		annotations: Transaction.time.of(time),
	});
}

describe('helixHistory', () => {
	it('keeps one insert session one step, even after a long pause', () => {
		const editor = new TestEditor('one\n', 0, 1);
		replayKeys(editor, 'i');
		typeAt(editor, 'a', 0);
		typeAt(editor, 'b', MINUTE);
		replayKeys(editor, '\x1b');
		expect(undoDepth(editor.state)).toBe(1);
		replayKeys(editor, 'u');
		expect(editor.text).toBe('one\n');
	});

	it('keeps Backspace and Tab in the insert session', () => {
		const editor = new TestEditor('one\n', 0, 1);
		replayKeys(editor, 'iabc\x7f\tx\x1b');
		expect(undoDepth(editor.state)).toBe(1);
	});

	it('makes each normal command a step of its own', () => {
		const editor = new TestEditor('one\ntwo\nthree\n', 0, 1);
		replayKeys(editor, 'xdxd');
		expect(undoDepth(editor.state)).toBe(2);
	});
});
