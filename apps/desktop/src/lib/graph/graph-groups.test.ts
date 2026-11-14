// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import type { GraphPoint } from './graph-data.ts';
import { type Halo, layoutGroups } from './graph-groups.ts';

const point = (path: string): GraphPoint => ({
	path,
	title: path,
	degree: 0,
	radius: 4,
});

const points = [
	point('A.typ'),
	point('Maths/B.typ'),
	point('Maths/Algebra/C.typ'),
	point('Maths/Algebra/D.typ'),
	point('Philo/E.typ'),
	point('Welcome/Examples/Deep/F.typ'),
];

// Whether the circle `inner` lies inside the circle `outer`.
function isInside(inner: Halo, outer: Halo): boolean {
	const away = Math.hypot(
		inner.across - outer.across,
		inner.down - outer.down,
	);
	return away + inner.radius <= outer.radius + 1e-6;
}

describe('layoutGroups', () => {
	const layout = layoutGroups(points);
	const halo = (folder: string) =>
		layout.halos.find((entry) => entry.folder === folder);

	it('draws a circle for every folder, empty ones above notes too', () => {
		expect(layout.halos.map((entry) => entry.folder)).toEqual([
			'Maths',
			'Maths/Algebra',
			'Philo',
			'Welcome',
			'Welcome/Examples',
			'Welcome/Examples/Deep',
		]);
	});

	it('nests the circle of a subfolder in the circle of its folder', () => {
		const pairs = [
			['Maths/Algebra', 'Maths'],
			['Welcome/Examples', 'Welcome'],
			['Welcome/Examples/Deep', 'Welcome/Examples'],
		] as const;
		for (const [inner, outer] of pairs) {
			const child = halo(inner);
			const parent = halo(outer);
			expect(child && parent && isInside(child, parent)).toBe(true);
		}
		expect(halo('Maths/Algebra')?.depth).toBe(2);
	});

	it('keeps folders side by side apart', () => {
		const maths = halo('Maths');
		const philo = halo('Philo');
		const away = maths && philo
			&& Math.hypot(maths.across - philo.across, maths.down - philo.down);
		const reach = (maths?.radius ?? 0) + (philo?.radius ?? 0);
		expect(away).toBeGreaterThan(reach);
	});

	it('puts the notes of each folder in a cluster of its own', () => {
		expect([...layout.clusters.keys()].sort()).toEqual([
			'',
			'Maths',
			'Maths/Algebra',
			'Philo',
			'Welcome/Examples/Deep',
		]);
	});
});
