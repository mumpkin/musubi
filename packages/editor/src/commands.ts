// SPDX-License-Identifier: GPL-3.0-or-later
// The command registry: every action of the editor is a named command. Keys
// and the command line only map to these names.
import { pairCommands } from './auto-pairs.ts';
import type { Command, CommandContext } from './context.ts';
import { editingCommands } from './editing.ts';
import { showJumpLabels } from './jump-labels.ts';
import { modeCommands } from './modes.ts';
import { motionCommands } from './motions.ts';
import { navigationCommands } from './navigation.ts';
import { objectCommands } from './objects.ts';
import { searchCommands } from './search.ts';

export const commands = {
	...motionCommands,
	...editingCommands,
	...modeCommands,
	...objectCommands,
	...pairCommands,
	...navigationCommands,
	...searchCommands,
	showJumpLabels,
} satisfies Record<string, Command>;

export type CommandName = keyof typeof commands;

// Commands that a count repeats, as `3j` or `2w`. Others read the count
// themselves (`3gg`) or ignore it.
const REPEATED = new Set<CommandName>([
	'moveCharLeft',
	'moveCharRight',
	'moveLineDown',
	'moveLineUp',
	'moveNextWordStart',
	'moveNextWordEnd',
	'movePreviousWordStart',
	'extendLineBelow',
	'searchNext',
	'searchPrevious',
]);

// Most repetitions of a command by a count, so that a mistyped count does
// not freeze the editor.
const MAX_REPEAT = 10_000;

export function runCommand(
	name: CommandName,
	context: CommandContext,
	argument?: string,
): void {
	const { count } = context;
	if (count === undefined || !REPEATED.has(name)) {
		commands[name](context, argument);
		return;
	}
	for (let time = 0; time < Math.min(count, MAX_REPEAT); time += 1) {
		commands[name]({ ...context, count: undefined }, argument);
	}
}
