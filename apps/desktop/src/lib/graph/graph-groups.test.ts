// SPDX-License-Identifier: GPL-3.0-or-later
import { forceSimulation } from 'd3-force';
import { describe, expect, it } from 'vitest';

import type { GraphPoint } from './graph-data.ts';
import { folderGroups } from './graph-group-force.ts';
import { type Halo, halosAround } from './graph-groups.ts';

// A note of `path` at `across`, `down`.
const placed = (path: string, across: number, down = 0): GraphPoint => ({
	path,
	title: path,
	degree: 0,
	radius: 4,
	// `x` and `y` are the names d3-force gives positions.
	// eslint-disable-next-line id-length
	x: across,
	// eslint-disable-next-line id-length
	y: down,
});

// Whether the circles `one` and `other` do not touch.
function apart(one: Halo, other: Halo): boolean {
	const away = Math.hypot(one.across - other.across, one.down - other.down);
	return away > one.radius + other.radius;
}

// Whether the circle `inner` lies inside the circle `outer`.
function isInside(inner: Halo, outer: Halo): boolean {
	const away = Math.hypot(
		inner.across - outer.across,
		inner.down - outer.down,
	);
	return away + inner.radius <= outer.radius + 1e-6;
}

describe('halosAround', () => {
	it('nests the circles around the notes as they are', () => {
		const halos = halosAround([
			placed('Maths/B.typ', 0),
			placed('Maths/Algebra/C.typ', 40),
			placed('Welcome/Examples/Deep/D.typ', 90),
		]);
		expect(halos.map((halo) => halo.folder)).toEqual([
			'Maths',
			'Welcome',
			'Maths/Algebra',
			'Welcome/Examples',
			'Welcome/Examples/Deep',
		]);
		const circle = (folder: string) =>
			halos.find((halo) => halo.folder === folder);
		const pairs = [
			['Maths/Algebra', 'Maths'],
			['Welcome/Examples/Deep', 'Welcome/Examples'],
			['Welcome/Examples', 'Welcome'],
		] as const;
		for (const [inner, outer] of pairs) {
			const child = circle(inner);
			const parent = circle(outer);
			expect(child && parent && isInside(child, parent)).toBe(true);
		}
	});

	it('follows a note moved away', () => {
		const near = halosAround([
			placed('Maths/B.typ', 0),
			placed('Maths/C.typ', 10),
		]);
		const far = halosAround([
			placed('Maths/B.typ', 0),
			placed('Maths/C.typ', 200),
		]);
		const nearRadius = near[0]?.radius ?? 0;
		expect(far[0]?.radius).toBeGreaterThan(nearRadius + 90);
	});

	it('holds a pill whole', () => {
		const pill = {
			...placed('Maths/B.typ', 0),
			halfWidth: 50,
			halfHeight: 8,
		};
		expect(halosAround([pill])[0]?.radius).toBeGreaterThanOrEqual(50);
	});
});

describe('folderGroups', () => {
	const TICKS = 200;

	it('gathers the notes of a folder and parts two folders', () => {
		const points = [
			placed('Maths/A.typ', -100),
			placed('Philo/B.typ', -90),
			placed('Maths/C.typ', 100),
			placed('Philo/D.typ', 110),
		];
		forceSimulation(points)
			.force('groups', folderGroups())
			.stop()
			.tick(TICKS);
		const [maths, philo] = halosAround(points);
		expect(maths && philo && apart(maths, philo)).toBe(true);
	});
});
