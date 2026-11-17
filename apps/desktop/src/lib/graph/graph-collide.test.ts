// SPDX-License-Identifier: GPL-3.0-or-later
import { forceSimulation } from 'd3-force';
import { describe, expect, it } from 'vitest';

import { pillCollide } from './graph-collide.ts';
import type { GraphPoint } from './graph-data.ts';
import { simulate } from './graph-simulation.ts';

// `x` and `y` are the names d3-force gives positions.
/* eslint-disable id-length */
const pill = (path: string, x: number): GraphPoint => ({
	path,
	title: path,
	degree: 0,
	radius: 3,
	halfWidth: 30,
	halfHeight: 8,
	x,
	y: 0,
});
/* eslint-enable id-length */

const STEPS = 30;

describe('pillCollide', () => {
	it('pushes overlapping pills apart until they no longer cover', () => {
		const points = [pill('A', 0), pill('B', 10)];
		forceSimulation(points)
			.force('collide', pillCollide())
			.stop()
			.tick(STEPS);
		const [first, second] = points;
		const gap = Math.abs((second?.x ?? 0) - (first?.x ?? 0));
		expect(gap).toBeGreaterThanOrEqual(60);
	});
});

describe('simulate', () => {
	const model = { points: [pill('M/A', 0), pill('M/B', 50)], edges: [] };

	it('groups the notes by folder only when asked', () => {
		const plain = simulate(model, undefined).stop();
		const grouped = simulate(model, '').stop();
		expect(plain.force('groups')).toBeFalsy();
		expect(grouped.force('groups')).toBeTruthy();
		expect(grouped.force('collide')).toBeTruthy();
	});
});
