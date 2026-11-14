// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import type { Graph } from '../bindings/Graph.ts';
import { EVERY_NOTE, filterGraph, folderOf } from './graph-filter.ts';

const graph: Graph = {
	nodes: [
		{ path: 'A.typ', title: 'A' },
		{ path: 'Maths/B.typ', title: 'B' },
		{ path: 'Maths/Algebra/C.typ', title: 'C' },
		{ path: 'Philo/D.typ', title: 'D' },
		{ path: 'Mathsy/E.typ', title: 'E' },
	],
	links: [
		{ source: 0, target: 1 },
		{ source: 3, target: 0 },
		{ source: 1, target: 2 },
	],
};

const links = { kind: 'links', folder: undefined } as const;
const folder = (chosen: string | undefined) =>
	({ kind: 'folder', folder: chosen }) as const;

const paths = (filtered: Graph): string[] =>
	filtered.nodes.map((node) => node.path);

describe('filterGraph', () => {
	it('keeps every note without a filter', () => {
		expect(filterGraph(graph, EVERY_NOTE, 'A.typ')).toEqual(graph);
	});

	it('keeps the notes linked to the note, both ways', () => {
		const filtered = filterGraph(graph, links, 'A.typ');
		expect(paths(filtered)).toEqual(['A.typ', 'Maths/B.typ', 'Philo/D.typ']);
		expect(filtered.links).toEqual([
			{ source: 0, target: 1 },
			{ source: 2, target: 0 },
		]);
	});

	it('keeps the notes of the folder and of its subfolders', () => {
		const filtered = filterGraph(graph, folder(undefined), 'Maths/B.typ');
		expect(paths(filtered)).toEqual(['Maths/B.typ', 'Maths/Algebra/C.typ']);
		expect(filtered.links).toEqual([{ source: 0, target: 1 }]);
	});

	it('keeps the notes of a folder chosen apart from the note', () => {
		const filtered = filterGraph(graph, folder('Philo'), 'Maths/B.typ');
		expect(paths(filtered)).toEqual(['Philo/D.typ']);
	});

	it('keeps everything for a note unknown to the graph', () => {
		expect(paths(filterGraph(graph, links, ''))).toHaveLength(5);
	});
});

describe('folderOf', () => {
	it('gives the folder of a note', () => {
		expect(folderOf('Maths/Algebra/C.typ')).toBe('Maths/Algebra');
		expect(folderOf('A.typ')).toBe('');
	});
});
