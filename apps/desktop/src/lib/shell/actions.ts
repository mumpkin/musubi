// SPDX-License-Identifier: GPL-3.0-or-later
// Actions offered by the command palette and the pane headers.

export interface PaletteCommand {
	label: string;
	group: string;
	shortcut?: string;
	run: () => void;
}

export type IconName
	= | 'edit'
		| 'read'
		| 'split'
		| 'close'
		| 'trash'
		| 'newNote'
		| 'newFolder'
		| 'folded'
		| 'unfolded'
		| 'minimize'
		| 'maximize'
		| 'modified'
		| 'pin'
		| 'recent'
		| 'notebook'
		| 'archive'
		| 'unarchive';

export interface PaneAction {
	label: string;
	icon: IconName;
	shortcut: string;
	run: () => void;
}
