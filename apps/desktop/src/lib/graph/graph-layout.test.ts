// SPDX-License-Identifier: GPL-3.0-or-later
import { zoomIdentity } from 'd3-zoom';
import { afterEach, describe, expect, it } from 'vitest';

import { type GraphModel, toModel } from './graph-data.ts';
import { GraphLayout } from './graph-layout.ts';

const graph = {
	nodes: [
		{ path: 'Maths/A.typ', title: 'A' },
		{ path: 'Maths/B.typ', title: 'B' },
		{ path: 'C.typ', title: 'C' },
	],
	links: [
		{ source: 0, target: 1 },
		{ source: 1, target: 2 },
	],
};

const positions = (model: GraphModel) =>
	model.points.map((point) => [point.x, point.y]);

const shape = 'dot' as const;

describe('GraphLayout', () => {
	const layout = new GraphLayout(() => undefined);

	afterEach(() => {
		layout.stop();
	});

	it('moves nothing when shown the same notes again', () => {
		expect(layout.show({ model: toModel(graph), groupBase: '', shape }))
			.toBe(true);
		layout.simulation?.tick(10);
		const before = positions(layout.model);
		expect(layout.show({ model: toModel(graph), groupBase: '', shape }))
			.toBe(false);
		expect(positions(layout.model)).toEqual(before);
	});

	it('lays out again when the grouping or the shape changes', () => {
		const model = toModel(graph);
		layout.show({ model, groupBase: undefined, shape });
		expect(layout.show({ model: toModel(graph), groupBase: '', shape }))
			.toBe(true);
		const pill = 'pill' as const;
		expect(layout.show({ model: toModel(graph), groupBase: '', shape: pill }))
			.toBe(true);
	});

	it('knows the neighbours of each note and the most linked first', () => {
		layout.show({ model: toModel(graph), groupBase: undefined, shape });
		const [first, middle, last] = layout.model.points;
		expect(layout.byDegree[0]).toBe(middle);
		expect(middle && [...(layout.neighbours.get(middle) ?? [])])
			.toEqual([first, last]);
	});

	it('frees the dragged note, its group and its links', () => {
		layout.show({ model: toModel(graph), groupBase: '', shape });
		const [first, middle, last] = layout.model.points;
		if (!first || !middle || !last) {
			throw new Error('three notes expected');
		}
		const free = layout.freeAround(first, '');
		expect(free.has(first) && free.has(middle)).toBe(true);
		expect(free.has(last)).toBe(false);
	});

	it('hits a small dot from a few pixels away', () => {
		layout.show({ model: toModel(graph), groupBase: undefined, shape });
		const [first] = layout.model.points;
		const place: [number, number] = [(first?.x ?? 0) + 8, first?.y ?? 0];
		expect(layout.pointAt(zoomIdentity, place)).toBe(first);
		const far: [number, number] = [(first?.x ?? 0) + 40, first?.y ?? 0];
		expect(layout.pointAt(zoomIdentity.scale(4), far)).toBeUndefined();
	});
});
