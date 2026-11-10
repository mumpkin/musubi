// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import { buildTree, titleIn } from './tree.ts';

const TREE = {
	folders: ['Maths', 'Maths/Algèbre', 'Philo'],
	notes: [
		{ path: 'Zeta.typ', title: 'Zeta' },
		{ path: 'Alpha.typ', title: 'Alpha' },
		{ path: 'Maths/Analyse.typ', title: 'Analyse' },
		{ path: 'Maths/Algèbre/Groupes.typ', title: 'Groupes' },
	],
};

describe('buildTree', () => {
	it('nests folders and notes, sorted', () => {
		const root = buildTree(TREE);
		expect(root.notes.map((note) => note.title)).toEqual(['Alpha', 'Zeta']);
		expect(root.folders.map((folder) => folder.name)).toEqual([
			'Maths',
			'Philo',
		]);
		const maths = root.folders[0];
		expect(maths?.notes.map((note) => note.title)).toEqual(['Analyse']);
		expect(maths?.folders[0]?.notes[0]?.title).toBe('Groupes');
	});
});

describe('titleIn', () => {
	it('finds the title of a note, or falls back on its path', () => {
		expect(titleIn(TREE, 'Maths/Analyse.typ')).toBe('Analyse');
		expect(titleIn(TREE, 'Missing.typ')).toBe('Missing.typ');
	});
});
