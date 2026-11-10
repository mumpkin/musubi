// SPDX-License-Identifier: GPL-3.0-or-later
// What commands receive: the editor and the services of the application.
import type {
	EditorState,
	Transaction,
	TransactionSpec,
} from '@codemirror/state';

import { type EditorMode, modeField, setMode } from './mode.ts';

// What a command acts on: an `EditorView` in the app, a plain state in tests.
export interface CommandTarget {
	readonly state: EditorState;
	dispatch: (...specs: (Transaction | TransactionSpec)[]) => void;
}

export type PromptKind = 'command' | 'select';

export interface Clipboard {
	write: (text: string) => Promise<void>;
	read: () => Promise<string>;
}

// Services of the application around the editor.
export interface EditorHost {
	write: () => void;
	quit: () => void;
	openPrompt: (kind: PromptKind) => void;
	clipboard: Clipboard;
}

export interface CommandContext {
	target: CommandTarget;
	host: EditorHost;
	// Text yanked or deleted last, used when the system clipboard cannot be
	// read.
	register: { text: string };
}

export type Command = (context: CommandContext) => void;

export function currentMode(state: EditorState): EditorMode {
	return state.field(modeField);
}

export function changeMode(target: CommandTarget, next: EditorMode): void {
	target.dispatch({ effects: setMode.of(next) });
}
