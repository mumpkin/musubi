// SPDX-License-Identifier: GPL-3.0-or-later
// Keys of the reading view: the keymap of the editor in normal mode, so
// that a key does the same thing in both views.
import { resolveKey } from '@musubi/editor';

import type { ReadingNavigator } from './reading-navigator.ts';

// A `keydown` handler; `onEscape` runs for `Escape` outside a sequence.
export function readingKeyHandler(
	navigator: () => ReadingNavigator | undefined,
	onEscape: () => void,
) {
	let pending = '';
	// Whether the key was used.
	function press(key: string): boolean {
		if (key === 'Escape' && pending === '') {
			onEscape();
			return true;
		}
		const resolution = resolveKey('normal', pending, key);
		pending = resolution.pending ?? '';
		const { command, count } = resolution;
		if (command === undefined) {
			return resolution.pending !== undefined;
		}
		return navigator()?.run(command, count) === true;
	}
	return (event: KeyboardEvent): void => {
		if (event.altKey || event.metaKey) {
			return;
		}
		if (press(event.ctrlKey ? `C-${event.key}` : event.key)) {
			event.preventDefault();
		}
	};
}
