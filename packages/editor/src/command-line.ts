// SPDX-License-Identifier: GPL-3.0-or-later
// Typed commands of the `:` command line.
import type { CommandName } from './commands.ts';

const typedCommands = new Map<string, CommandName[]>([
	['w', ['write']],
	['write', ['write']],
	['q', ['quit']],
	['quit', ['quit']],
	['wq', ['write', 'quit']],
	['x', ['write', 'quit']],
]);

// Commands to run for a command line, or `undefined` if it is unknown.
export function parseCommandLine(line: string): CommandName[] | undefined {
	return typedCommands.get(line.trim());
}
