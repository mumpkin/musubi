// SPDX-License-Identifier: GPL-3.0-or-later
// How the text of the tree looks in its editor: ids hidden and skipped by
// the cursor (oil.nvim's `constrain_cursor`), folders marked, and invalid
// lines underlined with their message.
import {
	EditorSelection,
	EditorState,
	type Extension,
	type Range,
	StateEffect,
	StateField,
} from '@codemirror/state';
import {
	Decoration,
	type DecorationSet,
	EditorView,
	WidgetType,
} from '@codemirror/view';

import type { LineError } from './tree-parse.ts';
import { ID_PATTERN } from './tree-text.ts';

const hiddenId = Decoration.replace({});
const folderLine = Decoration.line({ class: 'tree-folder' });
const errorLine = Decoration.line({ class: 'tree-error' });

// The range of the id of each line: `[from, to)`.
function idRanges(state: EditorState): { from: number; to: number }[] {
	const ranges: { from: number; to: number }[] = [];
	for (let number = 1; number <= state.doc.lines; number += 1) {
		const line = state.doc.line(number);
		const match = ID_PATTERN.exec(line.text);
		if (match) {
			const from = line.from + (match.groups?.indent?.length ?? 0);
			ranges.push({ from, to: line.from + match[0].length });
		}
	}
	return ranges;
}

function lineDecorations(state: EditorState): DecorationSet {
	const marks: Range<Decoration>[] = [];
	for (const { from, to } of idRanges(state)) {
		marks.push(hiddenId.range(from, to));
	}
	for (let number = 1; number <= state.doc.lines; number += 1) {
		const line = state.doc.line(number);
		if (line.text.trimEnd().endsWith('/')) {
			marks.push(folderLine.range(line.from));
		}
	}
	return Decoration.set(marks, true);
}

const hiddenIds = StateField.define<DecorationSet>({
	create: lineDecorations,
	update: (value, transaction) => transaction.docChanged
		? lineDecorations(transaction.state)
		: value,
	provide: (field) => [
		EditorView.decorations.from(field),
		EditorView.atomicRanges.of((view) => view.state.field(field)),
	],
});

// A cursor that lands in an id moves to the name after it. Selections
// that reach into the name, as `x` does, are left alone.
const constrainCursor = EditorState.transactionFilter.of((transaction) => {
	const { selection } = transaction;
	if (!selection) {
		return transaction;
	}
	const ids = idRanges(transaction.state);
	const { length } = transaction.state.doc;
	const ranges = selection.ranges.map((range) => {
		const id = ids.find(({ from, to }) =>
			range.from >= from && range.from < to && range.to <= to);
		return id
			? EditorSelection.range(id.to, Math.min(id.to + 1, length))
			: range;
	});
	const isChanged = ranges.some((range, index) =>
		range !== selection.ranges[index]);
	return isChanged
		? [transaction, {
				selection: EditorSelection.create(ranges, selection.mainIndex),
				sequential: true,
			}]
		: transaction;
});

class ErrorMessage extends WidgetType {
	private readonly message: string;

	constructor(message: string) {
		super();
		this.message = message;
	}

	override eq(other: ErrorMessage): boolean {
		return other.message === this.message;
	}

	// Name imposed by CodeMirror.
	// eslint-disable-next-line @typescript-eslint/naming-convention
	override toDOM(): HTMLElement {
		const element = document.createElement('span');
		element.className = 'tree-error-message';
		element.textContent = this.message;
		return element;
	}
}

// Shows the errors of the last `:w`; any change clears them.
export const showErrors = StateEffect.define<LineError[]>();

const errorMarks = StateField.define<DecorationSet>({
	create: () => Decoration.none,
	update(value, transaction) {
		const effect = transaction.effects.find((candidate) =>
			candidate.is(showErrors));
		if (effect?.is(showErrors)) {
			const { doc } = transaction.state;
			return Decoration.set(effect.value.flatMap(({ line, message }) => {
				const { from, to } = doc.line(line);
				return [
					errorLine.range(from),
					Decoration.widget({
						widget: new ErrorMessage(message),
						side: 1,
					}).range(to),
				];
			}), true);
		}
		return transaction.docChanged ? Decoration.none : value;
	},
	provide: (field) => EditorView.decorations.from(field),
});

export function treeDecorations(): Extension {
	return [hiddenIds, constrainCursor, errorMarks];
}
