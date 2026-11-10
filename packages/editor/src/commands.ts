// SPDX-License-Identifier: GPL-3.0-or-later
// The command registry: every action of the editor is a named command. Keys
// and the command line only map to these names.
import type { Command, CommandContext } from './context.ts';
import { editingCommands } from './editing.ts';
import { modeCommands } from './modes.ts';
import { motionCommands } from './motions.ts';

export const commands = {
	...motionCommands,
	...editingCommands,
	...modeCommands,
} satisfies Record<string, Command>;

export type CommandName = keyof typeof commands;

export function runCommand(name: CommandName, context: CommandContext): void {
	commands[name](context);
}
