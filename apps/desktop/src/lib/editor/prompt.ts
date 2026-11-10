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

// Unknown commands are ignored for now; error messages come with the real
// command line.
export function runPrompt({ view, host, kind, line }: PromptRequest): void {
	if (kind === 'select') {
		selectMatches(view, line);
		return;
	}
	const register = { text: '' };
	for (const name of parseCommandLine(line) ?? []) {
		runCommand(name, { target: view, host, register });
	}
}
