// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import {
	type GraphPoint,
	placeNearNeighbours,
	pointUnder,
	radiusFor,
	sameNotes,
	toModel,
} from './graph-data.ts';

describe('toModel', () => {
	it('counts the links of each note', () => {
		const model = toModel({
			nodes: [
				{ path: 'A.typ', title: 'A' },
				{ path: 'B.typ', title: 'B' },
				{ path: 'C.typ', title: 'C' },
			],
			links: [
				{ source: 0, target: 1 },
				{ source: 2, target: 1 },
			],
		});
		expect(model.points.map((point) => point.degree)).toEqual([1, 2, 1]);
		expect(model.points[1]?.radius).toBe(radiusFor(2));
		expect(model.edges).toHaveLength(2);
	});
});

const at = (across: number, down: number) => ({ across, down });

describe('pointUnder', () => {
	const point = (path: string, across: number): GraphPoint => ({
		path,
		title: path,
		degree: 0,
		radius: 4,
		// `x` and `y` are the names d3-force gives positions.
		// eslint-disable-next-line id-length
		x: across,
		// eslint-disable-next-line id-length
		y: 0,
	});

	it('finds a note only on its disc', () => {
		const points = [point('A', 0), point('B', 20)];
		expect(pointUnder(points, at(3, 0))?.path).toBe('A');
		expect(pointUnder(points, at(0, 4))?.path).toBe('A');
		expect(pointUnder(points, at(6, 0))).toBeUndefined();
		expect(pointUnder(points, at(19, 2))?.path).toBe('B');
	});

	it('prefers the note drawn on top', () => {
		const points = [point('A', 0), point('B', 2)];
		expect(pointUnder(points, at(1, 0))?.path).toBe('B');
	});

	it('finds the nearest note within the slack', () => {
		const points = [point('A', 0), point('B', 20)];
		expect(pointUnder(points, at(9, 0))).toBeUndefined();
		expect(pointUnder(points, at(9, 0), 6)?.path).toBe('A');
		expect(pointUnder(points, at(13, 0), 6)?.path).toBe('B');
	});

	it('finds a pill on its whole width', () => {
		const pill = { ...point('A', 0), halfWidth: 30, halfHeight: 8 };
		expect(pointUnder([pill], at(25, 5))?.path).toBe('A');
		expect(pointUnder([pill], at(25, 10))).toBeUndefined();
	});
});

describe('sameNotes', () => {
	const graph = {
		nodes: [
			{ path: 'A.typ', title: 'A' },
			{ path: 'B.typ', title: 'B' },
		],
		links: [{ source: 0, target: 1 }],
	};

	it('tells when the notes and links are the same', () => {
		expect(sameNotes(toModel(graph), toModel(graph))).toBe(true);
		const fewer = toModel({ ...graph, links: [] });
		expect(sameNotes(toModel(graph), fewer)).toBe(false);
		const other = toModel({
			...graph,
			nodes: [graph.nodes[0] ?? { path: '', title: '' }, {
				path: 'C.typ',
				title: 'C',
			}],
		});
		expect(sameNotes(toModel(graph), other)).toBe(false);
	});
});

describe('placeNearNeighbours', () => {
	it('puts a new note next to a linked note already placed', () => {
		const model = toModel({
			nodes: [
				{ path: 'A.typ', title: 'A' },
				{ path: 'B.typ', title: 'B' },
				{ path: 'C.typ', title: 'C' },
			],
			links: [{ source: 0, target: 1 }],
		});
		const [placed, linked, alone] = model.points;
		// `x` and `y` are the names d3-force gives positions.
		// eslint-disable-next-line id-length
		Object.assign(placed ?? {}, { x: 100, y: 50 });
		placeNearNeighbours(model);
		const away = Math.hypot((linked?.x ?? 0) - 100, (linked?.y ?? 0) - 50);
		expect(away).toBeCloseTo(20);
		expect(alone?.x).toBeUndefined();
	});
});
