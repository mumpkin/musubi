// SPDX-License-Identifier: GPL-3.0-or-later
// Keys of the Helix profile. Keys only name commands of the registry.
import type { CommandName } from './commands.ts';
import type { EditorMode } from './mode.ts';

const shared: [string, CommandName][] = [
	['h', 'moveCharLeft'],
	['ArrowLeft', 'moveCharLeft'],
	['l', 'moveCharRight'],
	['ArrowRight', 'moveCharRight'],
	['j', 'moveLineDown'],
	['ArrowDown', 'moveLineDown'],
	['k', 'moveLineUp'],
	['ArrowUp', 'moveLineUp'],
	['w', 'moveNextWordStart'],
	['e', 'moveNextWordEnd'],
	['b', 'movePreviousWordStart'],
	['x', 'extendLineBelow'],
	['d', 'delete'],
	['c', 'change'],
	['y', 'yank'],
	['p', 'paste'],
	['P', 'pasteBefore'],
	['o', 'openBelow'],
	['O', 'openAbove'],
	['u', 'undo'],
	['U', 'redo'],
	['C', 'copySelectionOnNextLine'],
	['s', 'selectPrompt'],
	[';', 'collapseSelection'],
	['i', 'insertMode'],
	['a', 'appendMode'],
	[':', 'commandLine'],
	['gh', 'gotoLineStart'],
	['gl', 'gotoLineEnd'],
	['gs', 'gotoFirstNonWhitespace'],
];

export const keymaps: Record<EditorMode, Map<string, CommandName>> = {
	normal: new Map([...shared, ['v', 'selectMode']]),
	select: new Map([
		...shared,
		['v', 'normalMode'],
		['Escape', 'normalMode'],
	]),
	insert: new Map([['Escape', 'normalMode']]),
};

// Keys that start a sequence: `g` waits for the next key, as in Helix.
const PREFIXES = new Set(['g']);

export interface KeyResolution {
	command?: CommandName;
	// Keys typed so far when a sequence is not complete yet.
	pending?: string;
}

// What a key does in `mode`, after the keys `pending` of a sequence.
export function resolveKey(
	mode: EditorMode,
	pending: string,
	key: string,
): KeyResolution {
	const sequence = pending + key;
	const command = keymaps[mode].get(sequence);
	if (command !== undefined) {
		return { command };
	}
	if (pending === '' && PREFIXES.has(key) && mode !== 'insert') {
		return { pending: key };
	}
	return {};
}
