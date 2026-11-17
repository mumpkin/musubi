// SPDX-License-Identifier: GPL-3.0-or-later
// The editor options of the preferences, as CodeMirror extensions: long
// lines wrap (notes are prose), the line of the cursor is highlighted, the
// width of one level of indentation.
import { indentUnit } from '@codemirror/language';
import { EditorState, type Extension } from '@codemirror/state';
import { EditorView, highlightActiveLine } from '@codemirror/view';

export interface EditorOptions {
	softWrap: boolean;
	highlightCursorLine: boolean;
	indentWidth: number;
}

export function editorOptions(options: EditorOptions): Extension[] {
	const extensions: Extension[] = [
		indentUnit.of(' '.repeat(options.indentWidth)),
		EditorState.tabSize.of(options.indentWidth),
	];
	if (options.softWrap) {
		extensions.push(EditorView.lineWrapping);
	}
	if (options.highlightCursorLine) {
		extensions.push(highlightActiveLine());
	}
	return extensions;
}
