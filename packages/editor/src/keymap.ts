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
	['gw', 'showJumpLabels'],
	['mm', 'matchBrackets'],
	['gg', 'gotoFileStart'],
	['ge', 'gotoLastLine'],
	['G', 'gotoLine'],
	['/', 'searchForward'],
	['?', 'searchBackward'],
	['n', 'searchNext'],
	['N', 'searchPrevious'],
	['*', 'searchSelection'],
	['zz', 'alignViewCenter'],
	['zt', 'alignViewTop'],
	['zb', 'alignViewBottom'],
	['C-d', 'pageCursorHalfDown'],
	['C-u', 'pageCursorHalfUp'],
	['C-f', 'pageDown'],
	['C-b', 'pageUp'],
];

export const keymaps: Record<EditorMode, Map<string, CommandName>> = {
	normal: new Map([...shared, ['v', 'selectMode']]),
	select: new Map([
		...shared,
		['v', 'normalMode'],
		['Escape', 'normalMode'],
	]),
	insert: new Map([
		['Escape', 'normalMode'],
		['Backspace', 'deleteCharBackward'],
	]),
};

// Sequences followed by characters typed as the command's argument: the
// object of `mi`, the delimiter of `ms`, the two delimiters of `mr`.
interface ArgumentCommand {
	command: CommandName;
	length: number;
}

const WITH_ARGUMENT = new Map<string, ArgumentCommand>([
	['mi', { command: 'selectInside', length: 1 }],
	['ma', { command: 'selectAround', length: 1 }],
	['ms', { command: 'surroundAdd', length: 1 }],
	['md', { command: 'surroundDelete', length: 1 }],
	['mr', { command: 'surroundReplace', length: 2 }],
]);

export interface KeyResolution {
	command?: CommandName;
	argument?: string;
	// The count typed before the keys, as `3` in `3j`.
	count?: number;
	// Keys typed so far when a sequence is not complete yet.
	pending?: string;
}

function withArgument(sequence: string): KeyResolution | undefined {
	for (const [prefix, { command, length }] of WITH_ARGUMENT) {
		if (!sequence.startsWith(prefix)) {
			continue;
		}
		const argument = sequence.slice(prefix.length);
		return argument.length === length
			? { command, argument }
			: { pending: sequence };
	}
	return undefined;
}

function startsSequence(mode: EditorMode, sequence: string): boolean {
	const prefixes = [...keymaps[mode].keys(), ...WITH_ARGUMENT.keys()];
	return prefixes.some((keys) =>
		keys.length > sequence.length && keys.startsWith(sequence));
}

const COUNT = /^(?<digits>[1-9]\d*)?(?<keys>.*)$/su;

// Splits the count typed before a sequence from its keys.
function withoutCount(sequence: string): { count?: number; keys: string } {
	const groups = COUNT.exec(sequence)?.groups;
	const digits = groups?.digits;
	const keys = groups?.keys ?? sequence;
	return digits === undefined ? { keys } : { count: Number(digits), keys };
}

// What a key does in `mode`, after the keys `pending` of a sequence and a
// count. `Escape` cancels a sequence; an unknown sequence does nothing.
export function resolveKey(
	mode: EditorMode,
	pending: string,
	key: string,
): KeyResolution {
	if (pending !== '' && key === 'Escape') {
		return {};
	}
	if (mode === 'insert') {
		return resolveSequence(mode, pending + key);
	}
	const { count, keys } = withoutCount(pending + key);
	if (keys === '') {
		return { pending: pending + key };
	}
	const resolution = resolveSequence(mode, keys);
	if (resolution.pending !== undefined) {
		return { pending: pending + key };
	}
	return count === undefined ? resolution : { ...resolution, count };
}

function resolveSequence(mode: EditorMode, sequence: string): KeyResolution {
	const command = keymaps[mode].get(sequence);
	if (command !== undefined) {
		return { command };
	}
	if (mode === 'insert') {
		return {};
	}
	const argumentResolution = withArgument(sequence);
	if (argumentResolution) {
		return argumentResolution;
	}
	return startsSequence(mode, sequence) ? { pending: sequence } : {};
}
