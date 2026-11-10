// SPDX-License-Identifier: GPL-3.0-or-later
// Insert mode keeps the selections of Helix. CodeMirror types at empty
// cursors, so the selections are remembered when entering insert mode,
// followed through the edits, and restored when leaving it:
// - `i` types before each selection, which moves right with the text;
// - `a` types after each selection, which grows with the text.
import {
	EditorSelection,
	StateEffect,
	StateField,
} from '@codemirror/state';

export type InsertSide = 'before' | 'after';

interface InsertOrigin {
	from: number;
	to: number;
	side: InsertSide;
}

export const startInsert = StateEffect.define<InsertOrigin[] | null>();

export const insertOrigins = StateField.define<InsertOrigin[] | null>({
	create: () => null,
	update(origins, transaction) {
		for (const effect of transaction.effects) {
			if (effect.is(startInsert)) {
				return effect.value;
			}
		}
		if (!origins || !transaction.docChanged) {
			return origins;
		}
		const { changes } = transaction;
		return origins.map((origin) => ({
			from: changes.mapPos(origin.from, origin.side === 'after' ? -1 : 1),
			to: changes.mapPos(origin.to, 1),
			side: origin.side,
		}));
	},
});

// Cursors to type at, for the selections `origins`.
export function insertCursors(origins: InsertOrigin[]): EditorSelection {
	return EditorSelection.create(origins.map((origin) =>
		EditorSelection.cursor(origin.side === 'before' ? origin.from : origin.to),
	));
}

// The selections to restore when leaving insert mode. After `i` the cursor
// is at the start of the selection, after `a` at its end.
export function restoredSelection(origins: InsertOrigin[]): EditorSelection {
	return EditorSelection.create(origins.map((origin) =>
		origin.side === 'before'
			? EditorSelection.range(origin.to, origin.from)
			: EditorSelection.range(origin.from, origin.to),
	));
}
