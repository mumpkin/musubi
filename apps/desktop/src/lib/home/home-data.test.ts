// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it, vi } from 'vitest';

import type { NoteEntry } from '../bindings/NoteEntry.ts';
import type { SearchKind } from '../vault/search.ts';
import { homeData } from './home-data.ts';

describe('homeData', () => {
	it('reads the vault live and runs what the home screen asks', () => {
		const files = {
			recentNotes: [] as NoteEntry[],
			pinnedNotes: [] as NoteEntry[],
			tree: { notes: [] as NoteEntry[] },
		};
		const manager = { open: vi.fn(), reviewFocused: vi.fn() };
		const dialogs = { search: undefined as SearchKind | undefined };
		const start = vi.fn();
		const home = homeData({
			files,
			dueCounts: { vault: 3 },
			manager,
			dialogs,
			start,
		});
		expect(home.isEmpty).toBe(true);
		files.tree.notes = [{ path: 'A.typ', title: 'A' }];
		expect(home.isEmpty).toBe(false);
		expect(home.dueCount).toBe(3);
		home.onOpen('A.typ');
		home.onReview();
		home.onFind('text');
		home.onStart('openTutorial');
		expect(manager.open).toHaveBeenCalledWith('A.typ');
		expect(manager.reviewFocused).toHaveBeenCalledWith('');
		expect(dialogs.search).toBe('text');
		expect(start).toHaveBeenCalledWith('openTutorial');
	});
});
