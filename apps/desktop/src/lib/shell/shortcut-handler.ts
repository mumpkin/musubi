// SPDX-License-Identifier: GPL-3.0-or-later
// Reads the shortcuts of the interface before the panes see the keys.
import {
	keyName,
	resolveShortcut,
	type ShellAction,
	type ShortcutResolution,
} from './shortcuts.ts';

export interface ShortcutContext {
	// Keys are text while typing: insert mode, the command line, a picker.
	isTyping: (event: KeyboardEvent) => boolean;
	isReading: () => boolean;
	run: (action: ShellAction) => void;
}

// A `keydown` handler for the window, which remembers the keys of a
// sequence being typed (`Space`, `Ctrl-w`).
export function shortcutHandler(context: ShortcutContext) {
	let pendingKeys = '';
	return (event: KeyboardEvent): void => {
		if (context.isTyping(event)) {
			return;
		}
		// `i` edits the note of a reading pane, as in the editor.
		const isReadingEdit = context.isReading()
			&& pendingKeys === '' && event.key === 'i';
		const resolution: ShortcutResolution = isReadingEdit
			? { action: 'toggleMode', pending: '', isUsed: true }
			: resolveShortcut(pendingKeys, keyName(event));
		pendingKeys = resolution.pending;
		if (resolution.isUsed) {
			event.preventDefault();
			event.stopPropagation();
		}
		if (resolution.action) {
			context.run(resolution.action);
		}
	};
}
