// SPDX-License-Identifier: GPL-3.0-or-later
// The Helix profile as a CodeMirror extension: modes, keys and block cursor.
import {
	EditorState,
	type Extension,
	type Range,
} from '@codemirror/state';
import { Decoration, EditorView, WidgetType } from '@codemirror/view';

import { isPairCharacter, typeText } from './auto-pairs.ts';
import { runCommand } from './commands.ts';
import type {
	CommandContext,
	CommandTarget,
	EditorHost,
} from './context.ts';
import { insertOrigins } from './insert.ts';
import {
	jumpLabelDecorations,
	jumpLabelsField,
	pressJumpLabel,
	type VisibleText,
} from './jump-labels.ts';
import { resolveKey } from './keymap.ts';
import { linkCompletion, type LinkSource } from './link-completion.ts';
import { type EditorMode, modeField } from './mode.ts';
import { searchPatternField } from './search.ts';
import { cursorOf } from './selection.ts';
import { smoothScrolling } from './smooth-scroll.ts';

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
	'.helix-jump-label': { color: 'var(--warning)', fontWeight: 'bold' },
});

function hasModifier(event: KeyboardEvent): boolean {
	return event.altKey || event.metaKey || event.isComposing;
}

// The name of a key in the keymap: `C-d` for Ctrl and d.
function keyName(event: KeyboardEvent): string {
	return event.ctrlKey ? `C-${event.key}` : event.key;
}

// The view, with the part of the text on screen for `gw`.
function viewTarget(view: EditorView): CommandTarget & VisibleText {
	return {
		get state() {
			return view.state;
		},
		dispatch: (...specs) => {
			view.dispatch(...specs);
		},
		visibleRange: () => view.viewport,
		scroller: {
			visibleLines: () =>
				Math.floor(
					view.scrollDOM.clientHeight / view.defaultLineHeight,
				),
			scrollByLines: (lines) => {
				view.scrollDOM.scrollBy({
					top: lines * view.defaultLineHeight,
					behavior: 'smooth',
				});
			},
		},
	};
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
	if (!event.ctrlKey && pressJumpLabel(view, event.key)) {
		event.preventDefault();
		return true;
	}
	const mode = view.state.field(modeField);
	const resolution = resolveKey(mode, pending.keys, keyName(event));
	pending.keys = resolution.pending ?? '';
	const { command, argument, count } = resolution;
	if (command !== undefined) {
		const target = viewTarget(view);
		runCommand(command, { ...context, target, count }, argument);
	} else if (resolution.pending === undefined
		&& (mode === 'insert' || event.ctrlKey)) {
		// Typed text, or a Ctrl shortcut of CodeMirror or the system.
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

// Typing a delimiter in insert mode pairs it, as in Helix.
// Arguments: view, from, to, text.
const autoPairs = EditorView.inputHandler.of((view, ...rest) => {
	const [, , text] = rest;
	if (view.state.field(modeField) !== 'insert' || !isPairCharacter(text)) {
		return false;
	}
	view.dispatch(typeText(view.state, text));
	return true;
});

export interface HelixOptions {
	host: EditorHost;
	onModeChange: (mode: EditorMode) => void;
	// Notes and headings for links typed with `[[`.
	linkSource?: LinkSource;
}

export function helix({
	host,
	onModeChange,
	linkSource,
}: HelixOptions): Extension {
	const register = { text: '' };
	return [
		modeField,
		insertOrigins,
		jumpLabelsField,
		searchPatternField,
		smoothScrolling,
		jumpLabelDecorations,
		EditorState.allowMultipleSelections.of(true),
		keyHandler(host, register),
		autoPairs,
		linkSource ? linkCompletion(linkSource) : [],
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
