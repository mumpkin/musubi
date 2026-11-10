// SPDX-License-Identifier: GPL-3.0-or-later
// Runs what was typed in the command line of the editor.
import type { EditorView } from '@codemirror/view';
import {
	type EditorHost,
	parseCommandLine,
	type PromptKind,
	runCommand,
	selectMatches,
} from '@musubi/editor';

export interface PromptRequest {
	view: EditorView;
	host: EditorHost;
	kind: PromptKind;
	line: string;
}

// Runs a command line; resolves to an error message if it failed. `:w`
// finishes saving before `:wq` closes the pane.
export async function runPrompt(
	{ view, host, kind, line }: PromptRequest,
): Promise<string | undefined> {
	if (kind === 'select') {
		selectMatches(view, line);
		return undefined;
	}
	const names = parseCommandLine(line);
	if (!names) {
		return `Unknown command: ${line}`;
	}
	const register = { text: '' };
	for (const name of names) {
		if (name === 'write') {
			await host.write();
		} else {
			runCommand(name, { target: view, host, register });
		}
	}
	return undefined;
}
