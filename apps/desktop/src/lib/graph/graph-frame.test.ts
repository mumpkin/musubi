// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import type { GraphPoint } from './graph-data.ts';
import { frameOf } from './graph-frame.ts';

// `x` and `y` are the names d3-force gives positions.
/* eslint-disable id-length */
const point = (path: string, x: number, y: number): GraphPoint => ({
	path,
	title: path,
	degree: 0,
	radius: 4,
	x,
	y,
});
/* eslint-enable id-length */

const size = { width: 800, height: 600 };

describe('frameOf', () => {
	it('fits every note in view, centred', () => {
		const view = frameOf(
			[point('A.typ', -500, 0), point('B.typ', 500, 0)],
			size,
			undefined,
		);
		expect(view?.applyX(-500)).toBeGreaterThanOrEqual(0);
		expect(view?.applyX(500)).toBeLessThanOrEqual(size.width);
		expect(view?.applyX(0)).toBeCloseTo(size.width / 2);
	});

	it('does not blow up a few notes', () => {
		const view = frameOf([point('A.typ', 0, 0)], size, undefined);
		expect(view?.k).toBe(2);
	});

	it('makes room for the circles of the folders when grouped', () => {
		const points = [point('M/A.typ', -350, 0), point('M/B.typ', 350, 0)];
		const plain = frameOf(points, size, undefined);
		const grouped = frameOf(points, size, '');
		expect(grouped?.k).toBeLessThan(plain?.k ?? 0);
	});

	it('has nothing to frame without notes', () => {
		expect(frameOf([], size, undefined)).toBeUndefined();
	});
});
