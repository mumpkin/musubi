// SPDX-License-Identifier: GPL-3.0-or-later
// Editing modes of the Helix profile, stored in the editor state.
import { StateEffect, StateField } from '@codemirror/state';

export const editorModes = ['normal', 'insert', 'select'] as const;

export type EditorMode = (typeof editorModes)[number];

const modeIndicators: Record<EditorMode, string> = {
	normal: 'NORMAL',
	insert: 'INSERT',
	select: 'SELECT',
};

export function modeIndicator(mode: EditorMode): string {
	return modeIndicators[mode];
}

export const setMode = StateEffect.define<EditorMode>();

export const modeField = StateField.define<EditorMode>({
	create: () => 'normal',
	update(mode, transaction) {
		let next = mode;
		for (const effect of transaction.effects) {
			if (effect.is(setMode)) {
				next = effect.value;
			}
		}
		return next;
	},
});
