// SPDX-License-Identifier: GPL-3.0-or-later
import type { EditorMode } from '@musubi/editor';

import type { PaneAction } from './actions.ts';
import { shortcutLabel } from './shortcuts.ts';

// The panes of the main area: one by default, two side by side when split.
// Each shows any note, in reading or editing mode.

export type PaneMode = 'reading' | 'editing';

export interface PaneState {
	path: string;
	mode: PaneMode;
	// Unsaved text of the editor, kept while the pane shows the reading view.
	draft?: string | undefined;
	// Bumped to load the note from disk again (changed by another program).
	loads: number;
}

// What a pane reports to the shell.
export interface PaneEvents {
	focus: () => void;
	open: (path: string) => void;
	message: (text: string) => void;
	editorMode: (mode: EditorMode) => void;
	draft: (text: string | undefined) => void;
	saved: (path: string) => void;
	quit: (force: boolean) => void;
}

export const MAX_PANES = 2;

export function otherMode(mode: PaneMode): PaneMode {
	return mode === 'reading' ? 'editing' : 'reading';
}

interface PaneCallbacks {
	canSplit: boolean;
	toggleMode: () => void;
	split: () => void;
	close: () => void;
}

// Buttons of a pane header: switch the mode, then split or close.
export function paneActions(
	pane: PaneState,
	{ canSplit, toggleMode, split, close }: PaneCallbacks,
): PaneAction[] {
	const isReading = pane.mode === 'reading';
	const modeAction: PaneAction = {
		label: isReading ? 'Edit this note' : 'Read this note',
		icon: isReading ? 'edit' : 'read',
		shortcut: isReading ? 'i' : shortcutLabel('toggleMode'),
		run: toggleMode,
	};
	const paneAction: PaneAction = canSplit
		? {
				label: 'Split the pane',
				icon: 'split',
				shortcut: shortcutLabel('split'),
				run: split,
			}
		: {
				label: 'Close this pane',
				icon: 'close',
				shortcut: shortcutLabel('closePane'),
				run: close,
			};
	return [modeAction, paneAction];
}
