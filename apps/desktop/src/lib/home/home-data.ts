// SPDX-License-Identifier: GPL-3.0-or-later
// What the home screen shows and does: the notes modified last, the
// pinned ones, the flashcards due, and the ways to find a note; in a vault
// without notes, the ways to start one.
import type { NoteEntry } from '../bindings/NoteEntry.ts';
import type { SearchKind } from '../vault/search.ts';

// How to start an empty vault.
export type StartWay = 'newNote' | 'openTutorial';

export interface HomeData {
	readonly recent: NoteEntry[];
	readonly pinned: NoteEntry[];
	readonly dueCount: number;
	// The vault has no note yet.
	readonly isEmpty: boolean;
	onOpen: (path: string) => void;
	onStart: (way: StartWay) => void;
	onReview: () => void;
	onFind: (kind: SearchKind) => void;
}

interface HomeSources {
	files: {
		recentNotes: NoteEntry[];
		pinnedNotes: NoteEntry[];
		tree: { notes: NoteEntry[] };
	};
	dueCounts: { vault: number };
	manager: {
		open: (path: string) => void;
		reviewFocused: (scope: string) => void;
	};
	dialogs: { search: SearchKind | undefined };
	start: (way: StartWay) => void;
}

// The data of the home screen, read live from `sources`.
export function homeData(sources: HomeSources): HomeData {
	const { files, dueCounts, manager, dialogs, start } = sources;
	return {
		get recent() {
			return files.recentNotes;
		},
		get pinned() {
			return files.pinnedNotes;
		},
		get dueCount() {
			return dueCounts.vault;
		},
		get isEmpty() {
			return files.tree.notes.length === 0;
		},
		onStart: start,
		onOpen: (path) => {
			manager.open(path);
		},
		onReview: () => {
			manager.reviewFocused('');
		},
		onFind: (kind) => {
			dialogs.search = kind;
		},
	};
}
