// SPDX-License-Identifier: GPL-3.0-or-later
// Keys of the reading view: the keymap of the editor in normal mode, so
// that a key does the same thing in both views.
import { resolveKey } from '@musubi/editor';

import type { LinkCursor } from './link-cursor.ts';
import type { ReadingNavigator } from './reading-navigator.ts';

// `l` and `h` move between the links of the selected block, `Enter`
// follows the selected one; any other key leaves the links. Whether the
// key was used.
function pressLink(links: LinkCursor, key: string): boolean {
	if (key === 'l' || key === 'h') {
		return links.move(key === 'l' ? 1 : -1);
	}
	if (key === 'Enter' && links.isActive) {
		links.follow();
		links.clear();
		return true;
	}
	const wasActive = links.isActive;
	links.clear();
	return key === 'Escape' && wasActive;
}

// A `keydown` handler; `onEscape` runs for `Escape` outside a sequence.
export function readingKeyHandler(
	navigator: () => ReadingNavigator | undefined,
	onEscape: () => void,
	links: LinkCursor,
) {
	let pending = '';
	// Whether the key was used.
	function press(key: string): boolean {
		if (pending === '' && pressLink(links, key)) {
			return true;
		}
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
