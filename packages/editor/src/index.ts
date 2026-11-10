// SPDX-License-Identifier: GPL-3.0-or-later
// CodeMirror 6 editor and Helix mode. The first implementation comes with
// the Helix mode prototype.

export const editorModes = ['normal', 'insert', 'select'] as const;

export type EditorMode = (typeof editorModes)[number];

const modeIndicators: Record<EditorMode, string> = {
	normal: 'NOR',
	insert: 'INS',
	select: 'SEL',
};

export function modeIndicator(mode: EditorMode): string {
	return modeIndicators[mode];
}
