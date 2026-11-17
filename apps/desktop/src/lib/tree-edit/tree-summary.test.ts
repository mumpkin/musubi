// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import type { Operation } from './tree-plan.ts';
import { summary } from './tree-summary.ts';
import type { TreeEntry } from './tree-text.ts';

const entries = new Map<number, TreeEntry>([
	[1, { id: 1, kind: 'folder', path: 'Physics', name: 'Physics', parent: 0 }],
	[2, { id: 2, kind: 'note', path: 'Maths/A.typ', name: 'A', parent: 0 }],
]);

describe('summary', () => {
	it('names each operation as oil.nvim does', () => {
		const operations: Operation[] = [
			{
				kind: 'create',
				line: 3,
				parent: 'root',
				name: 'Ideas',
				isFolder: true,
				target: 'Ideas/',
			},
			{ kind: 'trash', id: 2 },
			{ kind: 'retitle', id: 2, title: 'B' },
			{
				kind: 'move',
				id: 1,
				parent: 'root',
				name: 'Physique',
				target: 'Physique/',
			},
			{
				kind: 'move',
				id: 1,
				parent: { entry: 3 },
				name: 'Physics',
				target: 'Maths/Physics/',
			},
		];
		expect(summary(operations, entries)).toEqual([
			{ label: 'CREATE', text: 'Ideas/' },
			{ label: 'TRASH', text: 'Maths/A' },
			{ label: 'RENAME', text: 'A → B' },
			{ label: 'RENAME', text: 'Physics/ → Physique/' },
			{ label: 'MOVE', text: 'Physics/ → Maths/Physics/' },
		]);
	});
});
