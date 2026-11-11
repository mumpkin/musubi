// SPDX-License-Identifier: GPL-3.0-or-later
// What commands receive: the editor and the services of the application.
import type {
	EditorState,
	Transaction,
	TransactionSpec,
} from '@codemirror/state';

import { type EditorMode, modeField, setMode } from './mode.ts';

// Scrolling of the view, for page moves. Tests have no view.
export interface Scroller {
	// Lines of text that fit on screen.
	visibleLines: () => number;
	// Scrolls smoothly by `lines` (negative: up).
	scrollByLines: (lines: number) => void;
}

// What a command acts on: an `EditorView` in the app, a plain state in tests.
export interface CommandTarget {
	readonly state: EditorState;
	dispatch: (...specs: (Transaction | TransactionSpec)[]) => void;
	scroller?: Scroller;
}

export type PromptKind = 'command' | 'select' | 'search' | 'reverseSearch';

export interface Clipboard {
	write: (text: string) => Promise<void>;
	read: () => Promise<string>;
}

// Services of the application around the editor.
export interface EditorHost {
	// Saves the note; resolves once it is on disk.
	write: () => Promise<void>;
	// Closes the pane; refuses unsaved changes unless `force`.
	quit: (force: boolean) => void;
	openPrompt: (kind: PromptKind) => void;
	clipboard: Clipboard;
}

export interface CommandContext {
	target: CommandTarget;
	host: EditorHost;
	// Text yanked or deleted last, used when the system clipboard cannot be
	// read.
	register: { text: string };
	// The count typed before the keys (`3` in `3j`), if any.
	count?: number | undefined;
}

// `argument` holds the characters typed after keys such as `mi` or `ms`.
export type Command = (context: CommandContext, argument?: string) => void;

export function currentMode(state: EditorState): EditorMode {
	return state.field(modeField);
}

export function changeMode(target: CommandTarget, next: EditorMode): void {
	target.dispatch({ effects: setMode.of(next) });
}
