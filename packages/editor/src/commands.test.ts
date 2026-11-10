// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import { parseCommandLine } from './command-line.ts';
import { selectMatches } from './editing.ts';
import { keymaps } from './keymap.ts';
import { TestEditor } from './test-editor.ts';

describe('motions', () => {
	it('selects words with w, e and b', () => {
		const editor = new TestEditor('one two three');
		expect(editor.run('moveNextWordStart').selections).toEqual([[0, 4]]);
		expect(editor.run('moveNextWordStart').selections).toEqual([[4, 8]]);
		expect(editor.run('movePreviousWordStart').selections).toEqual([[7, 4]]);
		expect(editor.run('moveNextWordEnd').selections).toEqual([[4, 7]]);
	});

	it('moves by character and by line, keeping the column', () => {
		const editor = new TestEditor('abc\ndef', 1);
		expect(editor.run('moveLineDown').selections).toEqual([[5, 6]]);
		expect(editor.run('moveCharRight').selections).toEqual([[6, 7]]);
		expect(editor.run('moveLineUp', 'moveCharLeft').selections).toEqual([
			[1, 2],
		]);
	});

	it('extends the selection in select mode', () => {
		const editor = new TestEditor('one two three');
		editor.run('selectMode', 'moveNextWordStart', 'moveNextWordStart');
		expect(editor.mode).toBe('select');
		expect(editor.selections).toEqual([[0, 8]]);
	});

	it('selects whole lines with x, one more line each time', () => {
		const editor = new TestEditor('one\ntwo\nthree', 1);
		expect(editor.run('extendLineBelow').selections).toEqual([[0, 4]]);
		expect(editor.run('extendLineBelow').selections).toEqual([[0, 8]]);
	});
});

describe('editing', () => {
	it('deletes the selection with d', () => {
		const editor = new TestEditor('one two', 0);
		editor.run('moveNextWordStart', 'delete');
		expect(editor.text).toBe('two');
		expect(editor.selections).toEqual([[0, 1]]);
	});

	it('deletes a line with x d, the next line taking its place', () => {
		const editor = new TestEditor('one\ntwo\nthree', 5);
		editor.run('extendLineBelow', 'delete');
		expect(editor.text).toBe('one\nthree');
		expect(editor.selections).toEqual([[4, 5]]);
	});

	it('sends deleted and changed text to the clipboard', () => {
		const editor = new TestEditor('one two', 0, 4);
		editor.run('delete');
		expect(editor.clipboardText).toBe('one ');
		editor.run('change');
		expect(editor.clipboardText).toBe('t');
	});

	it('changes the selection with c', () => {
		const editor = new TestEditor('one two', 0);
		editor.run('moveNextWordStart', 'change');
		expect(editor.text).toBe('two');
		expect(editor.mode).toBe('insert');
		expect(editor.selections).toEqual([[0, 0]]);
	});

	it('yanks to the clipboard and pastes after the selection', async () => {
		const editor = new TestEditor('one two', 0, 3);
		editor.run('yank');
		expect(editor.clipboardText).toBe('one');
		editor.run('paste');
		await new Promise((resolve) => setTimeout(resolve));
		expect(editor.text).toBe('oneone two');
		expect(editor.selections).toEqual([[3, 6]]);
	});

	it('undoes and redoes', () => {
		const editor = new TestEditor('one two', 0, 4);
		editor.run('delete', 'undo');
		expect(editor.text).toBe('one two');
		editor.run('redo');
		expect(editor.text).toBe('two');
	});

	it('copies the selection on the next line with C', () => {
		const editor = new TestEditor('abc\ndef', 1);
		editor.run('copySelectionOnNextLine');
		expect(editor.selections).toEqual([
			[1, 2],
			[5, 6],
		]);
		editor.run('delete');
		expect(editor.text).toBe('ac\ndf');
	});

	it('selects the matches of a regex inside the selection', () => {
		const editor = new TestEditor('a1 b22 c3', 0, 9);
		selectMatches(editor, String.raw`\d+`);
		expect(editor.selections).toEqual([
			[1, 2],
			[4, 6],
			[8, 9],
		]);
	});
});

describe('modes', () => {
	it('inserts before or after the selection', () => {
		expect(new TestEditor('abc', 0, 2).run('insertMode').selections)
			.toEqual([[0, 0]]);
		expect(new TestEditor('abc', 0, 2).run('appendMode').selections)
			.toEqual([[2, 2]]);
	});

	it('restores the selection when leaving insert mode', () => {
		const editor = new TestEditor('abc', 0).run('appendMode', 'normalMode');
		expect(editor.mode).toBe('normal');
		expect(editor.selections).toEqual([[0, 1]]);
	});

	it('opens the command line', () => {
		expect(new TestEditor('abc').run('commandLine').calls).toEqual([
			'prompt:command',
		]);
	});
});

describe('keymaps and command line', () => {
	it('maps keys to commands only', () => {
		expect(keymaps.normal.get('w')).toBe('moveNextWordStart');
		expect(keymaps.insert.get('w')).toBeUndefined();
		expect(keymaps.insert.get('Escape')).toBe('normalMode');
	});

	it('knows :w, :q, :q!, :wq and :x', () => {
		expect(parseCommandLine('w')).toEqual(['write']);
		expect(parseCommandLine(' q ')).toEqual(['quit']);
		expect(parseCommandLine('wq')).toEqual(['write', 'quit']);
		expect(parseCommandLine('x')).toEqual(['write', 'quit']);
		expect(parseCommandLine('q!')).toEqual(['forceQuit']);
		expect(parseCommandLine('unknown')).toBeUndefined();
	});
});
