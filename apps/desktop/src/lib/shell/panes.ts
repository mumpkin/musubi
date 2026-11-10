// SPDX-License-Identifier: GPL-3.0-or-later
// The panes of the main area: one by default, two side by side when split.
// Each shows any note, in reading or editing mode.

export type PaneMode = 'reading' | 'editing';

export interface PaneState {
	path: string;
	mode: PaneMode;
}

export const MAX_PANES = 2;

export function otherMode(mode: PaneMode): PaneMode {
	return mode === 'reading' ? 'editing' : 'reading';
}
