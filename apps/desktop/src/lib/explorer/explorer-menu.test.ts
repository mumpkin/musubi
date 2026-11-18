// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import {
	type EntryActions,
	entryMenu,
	headerMenu,
	rootMenu,
} from './explorer-menu.ts';

function recorder(): { calls: string[]; actions: EntryActions } {
	const calls: string[] = [];
	const record = (name: string) => (...values: string[]) => {
		calls.push([name, ...values].join(' '));
	};
	return {
		calls,
		actions: {
			onOpen: record('open'),
			onPin: record('pin'),
			onArchive: record('archive'),
			onCreate: record('create'),
			onDelete: record('delete'),
			onRename: record('rename'),
			onReview: record('review'),
		},
	};
}

const labels = (items: { label: string }[]): string[] =>
	items.map((item) => item.label);

describe('entryMenu', () => {
	it('offers the actions of a note', () => {
		const { actions } = recorder();
		const target = { path: 'A.typ', kind: 'note' as const, isPinned: true };
		expect(labels(entryMenu(target, actions))).toEqual([
			'Open',
			'Unpin',
			'Review the flashcards',
			'Rename or move',
			'Archive',
			'Move to the trash',
		]);
	});

	it('creates in a folder and unarchives an archived one', () => {
		const { calls, actions } = recorder();
		const target = {
			path: 'Archive/Maths',
			kind: 'folder' as const,
			isPinned: false,
		};
		const items = entryMenu(target, actions);
		expect(labels(items)).toEqual([
			'New note',
			'New folder',
			'Review the flashcards',
			'Rename or move',
			'Unarchive',
			'Move to the trash',
		]);
		for (const item of items) {
			item.run();
		}
		expect(calls).toEqual([
			'create note Archive/Maths',
			'create folder Archive/Maths',
			'review Archive/Maths',
			'rename Archive/Maths',
			'archive Archive/Maths',
			'delete Archive/Maths',
		]);
	});

	it('creates at the root from the empty space', () => {
		const { actions } = recorder();
		expect(labels(rootMenu(actions))).toEqual(['New note', 'New folder']);
	});
});

describe('headerMenu', () => {
	it('gathers the vault actions', () => {
		const { calls, actions } = recorder();
		const items = headerMenu({
			isEditing: false,
			onToggleTree: () => {
				calls.push('tree');
			},
			onCreate: actions.onCreate,
			onReview: actions.onReview,
		});
		expect(labels(items)).toEqual([
			'Edit the tree as text',
			'New note',
			'New folder',
			'Review the flashcards',
		]);
		for (const item of items) {
			item.run();
		}
		expect(calls).toEqual([
			'tree',
			'create note ',
			'create folder ',
			'review ',
		]);
	});
});
