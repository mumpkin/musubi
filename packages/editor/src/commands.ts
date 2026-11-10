// SPDX-License-Identifier: GPL-3.0-or-later
// The command registry: every action of the editor is a named command. Keys
// and the command line only map to these names.
import type { Command, CommandContext } from './context.ts';
import { editingCommands } from './editing.ts';
import { showJumpLabels } from './jump-labels.ts';
import { modeCommands } from './modes.ts';
import { motionCommands } from './motions.ts';
import { objectCommands } from './objects.ts';

export const commands = {
	...motionCommands,
	...editingCommands,
	...modeCommands,
	...objectCommands,
	showJumpLabels,
} satisfies Record<string, Command>;

export type CommandName = keyof typeof commands;

export function runCommand(
	name: CommandName,
	context: CommandContext,
	argument?: string,
): void {
	commands[name](context, argument);
}
