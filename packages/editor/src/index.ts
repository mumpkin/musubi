// SPDX-License-Identifier: GPL-3.0-or-later
// CodeMirror 6 editor with the Helix editing profile.

export { parseCommandLine } from './command-line.ts';
export { type CommandName, runCommand } from './commands.ts';
export type {
	Clipboard,
	CommandContext,
	CommandTarget,
	EditorHost,
	PromptKind,
} from './context.ts';
export { selectMatches } from './editing.ts';
export { helix, type HelixOptions } from './helix.ts';
export { keymaps } from './keymap.ts';
export {
	importChange,
	linkMarkup,
	type LinkSource,
	type LinkSuggestion,
} from './link-completion.ts';
export { type EditorMode, editorModes, modeField, modeIndicator } from './mode.ts';
