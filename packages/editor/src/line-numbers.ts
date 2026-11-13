// SPDX-License-Identifier: GPL-3.0-or-later
// The line numbers of the editor: absolute, or relative as Helix's
// `line-number = "relative"`: the line of the cursor shows its number, the
// others their distance to it, for counts such as `5j`.
import type { Extension } from '@codemirror/state';
import {
	EditorView,
	gutter,
	GutterMarker,
	lineNumbers,
} from '@codemirror/view';

class NumberMarker extends GutterMarker {
	private readonly text: string;

	constructor(text: string) {
		super();
		this.text = text;
	}

	override eq(other: NumberMarker): boolean {
		return other.text === this.text;
	}

	// Name imposed by CodeMirror.
	// eslint-disable-next-line @typescript-eslint/naming-convention
	override toDOM(): Node {
		return document.createTextNode(this.text);
	}
}

// The number shown for the line starting at `from`.
export function relativeNumber(view: EditorView, from: number): string {
	const { doc, selection } = view.state;
	const line = doc.lineAt(from).number;
	const cursor = doc.lineAt(selection.main.head).number;
	return String(line === cursor ? line : Math.abs(line - cursor));
}

const relativeGutter = gutter({
	class: 'cm-lineNumbers',
	lineMarker: (view, line) =>
		new NumberMarker(relativeNumber(view, line.from)),
	lineMarkerChange: (update) => update.selectionSet || update.docChanged,
	// As wide as the largest number, so that the text does not move.
	initialSpacer: (view) => new NumberMarker(String(view.state.doc.lines)),
	updateSpacer: (spacer, update) => {
		const next = new NumberMarker(String(update.state.doc.lines));
		return next.eq(spacer as NumberMarker) ? spacer : next;
	},
});

export function lineNumberGutter(isRelative: boolean): Extension {
	return isRelative ? relativeGutter : lineNumbers();
}
