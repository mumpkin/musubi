// SPDX-License-Identifier: GPL-3.0-or-later
import { getIndentUnit } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';

import { editorOptions } from './editor-options.ts';

describe('editorOptions', () => {
	it('sets the indent unit and the tab size', () => {
		const state = EditorState.create({
			extensions: editorOptions({
				softWrap: false,
				highlightCursorLine: false,
				indentWidth: 4,
			}),
		});
		expect(getIndentUnit(state)).toBe(4);
		expect(state.tabSize).toBe(4);
	});

	it('adds wrapping and the cursor line only when asked', () => {
		const few = editorOptions({
			softWrap: false,
			highlightCursorLine: false,
			indentWidth: 2,
		});
		const all = editorOptions({
			softWrap: true,
			highlightCursorLine: true,
			indentWidth: 2,
		});
		expect(all.length - few.length).toBe(2);
	});
});
