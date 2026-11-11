// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import { radiusFor, toModel } from './graph-data.ts';

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
