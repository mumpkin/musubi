// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import {
	type GraphPoint,
	pointUnder,
	radiusFor,
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
		expect(pointUnder(points, 3, 0)?.path).toBe('A');
		expect(pointUnder(points, 0, 4)?.path).toBe('A');
		expect(pointUnder(points, 6, 0)).toBeUndefined();
		expect(pointUnder(points, 19, 2)?.path).toBe('B');
	});

	it('prefers the note drawn on top', () => {
		const points = [point('A', 0), point('B', 2)];
		expect(pointUnder(points, 1, 0)?.path).toBe('B');
	});
});
