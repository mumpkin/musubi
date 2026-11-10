// SPDX-License-Identifier: GPL-3.0-or-later
// Actions offered by the command palette and the pane headers.

export interface PaletteCommand {
	label: string;
	group: string;
	shortcut?: string;
	run: () => void;
}

export interface PaneAction {
	label: string;
	icon: string;
	run: () => void;
}
