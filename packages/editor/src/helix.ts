// SPDX-License-Identifier: GPL-3.0-or-later
// The Helix profile as a CodeMirror extension: modes, keys and block cursor.
import {
	EditorState,
	type Extension,
	type Range,
} from '@codemirror/state';
import { Decoration, EditorView, WidgetType } from '@codemirror/view';

import { runCommand } from './commands.ts';
import type { CommandContext, EditorHost } from './context.ts';
import { insertOrigins } from './insert.ts';
import { resolveKey } from './keymap.ts';
import { type EditorMode, modeField } from './mode.ts';
import { cursorOf } from './selection.ts';

const cursorMark = Decoration.mark({ class: 'helix-cursor' });

// A line break or the end of the text has no glyph to mark: the cursor is
// drawn as a one-character block at the end of the line, as in Helix.
class LineEndCursor extends WidgetType {
	override eq(): boolean {
		return true;
	}

	// Name imposed by CodeMirror.
	// eslint-disable-next-line @typescript-eslint/naming-convention
	override toDOM(): HTMLElement {
		const element = document.createElement('span');
		element.className = 'helix-cursor helix-line-end-cursor';
		element.textContent = ' ';
		return element;
	}
}

const lineEndCursor = Decoration.widget({
	widget: new LineEndCursor(),
	side: 1,
});

function cursorDecoration(
	state: EditorState,
	cursor: number,
): Range<Decoration> {
	const isLineEnd
		= cursor >= state.doc.length || state.sliceDoc(cursor, cursor + 1) === '\n';
	return isLineEnd
		? lineEndCursor.range(cursor)
		: cursorMark.range(cursor, cursor + 1);
}

// Block cursor on the character at the head of each selection.
const blockCursors = EditorView.decorations.compute(
	['selection', modeField],
	(state) => {
		if (state.field(modeField) === 'insert') {
			return Decoration.none;
		}
		const marks = state.selection.ranges.map(
			(range) => cursorDecoration(state, cursorOf(range)),
		);
		return Decoration.set(marks, true);
	},
);

const modeClass = EditorView.editorAttributes.compute(
	[modeField],
	(state) => ({ class: `helix-${state.field(modeField)}` }),
);

const theme = EditorView.baseTheme({
	'&.helix-normal .cm-cursor, &.helix-select .cm-cursor': {
		display: 'none',
	},
	'.helix-cursor': { outline: '1px solid currentColor' },
});

function hasModifier(event: KeyboardEvent): boolean {
	return event.ctrlKey || event.altKey || event.metaKey || event.isComposing;
}

const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta']);

interface KeyState {
	context: Omit<CommandContext, 'target'>;
	// Keys of a sequence being typed, such as the `g` of `gh`.
	pending: { keys: string };
}

// Runs the command of a key; returns whether the key was used.
function handleKey(
	event: KeyboardEvent,
	view: EditorView,
	{ context, pending }: KeyState,
): boolean {
	if (hasModifier(event) || MODIFIER_KEYS.has(event.key)) {
		return false;
	}
	const mode = view.state.field(modeField);
	const resolution = resolveKey(mode, pending.keys, event.key);
	pending.keys = resolution.pending ?? '';
	if (resolution.command !== undefined) {
		runCommand(resolution.command, { ...context, target: view });
	} else if (resolution.pending === undefined) {
		return false;
	}
	event.preventDefault();
	return true;
}

function keyHandler(
	host: EditorHost,
	register: { text: string },
): Extension {
	const keyState: KeyState = {
		context: { host, register },
		pending: { keys: '' },
	};
	return EditorView.domEventHandlers({
		// Outside insert mode nothing types into the text: neither printable
		// keys nor `Enter`, `Backspace`, paste or input methods.
		beforeinput(event, view) {
			if (view.state.field(modeField) === 'insert') {
				return false;
			}
			event.preventDefault();
			return true;
		},
		keydown: (event, view) => handleKey(event, view, keyState),
	});
}

export interface HelixOptions {
	host: EditorHost;
	onModeChange: (mode: EditorMode) => void;
}

export function helix({ host, onModeChange }: HelixOptions): Extension {
	const register = { text: '' };
	return [
		modeField,
		insertOrigins,
		EditorState.allowMultipleSelections.of(true),
		keyHandler(host, register),
		blockCursors,
		modeClass,
		theme,
		EditorView.updateListener.of((update) => {
			const mode = update.state.field(modeField);
			if (mode !== update.startState.field(modeField)) {
				onModeChange(mode);
			}
		}),
	];
}
