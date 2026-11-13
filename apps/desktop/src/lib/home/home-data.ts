// SPDX-License-Identifier: GPL-3.0-or-later
// What the home screen shows and does: the notes modified last, the
// pinned ones, the flashcards due, and the ways to find a note.
import type { NoteEntry } from '../bindings/NoteEntry.ts';
import type { SearchKind } from '../vault/search.ts';

export interface HomeData {
	readonly recent: NoteEntry[];
	readonly pinned: NoteEntry[];
	readonly dueCount: number;
	onOpen: (path: string) => void;
	onReview: () => void;
	onFind: (kind: SearchKind) => void;
}

interface HomeSources {
	files: { recentNotes: NoteEntry[]; pinnedNotes: NoteEntry[] };
	dueCounts: { vault: number };
	manager: {
		open: (path: string) => void;
		reviewFocused: (scope: string) => void;
	};
	dialogs: { search: SearchKind | undefined };
}

// The data of the home screen, read live from `sources`.
export function homeData(sources: HomeSources): HomeData {
	const { files, dueCounts, manager, dialogs } = sources;
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
