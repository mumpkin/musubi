// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import type { GraphPoint } from './graph-data.ts';
import { Fades } from './graph-fades.ts';

const note = (path: string): GraphPoint => ({
	path,
	title: path,
	degree: 0,
	radius: 3,
});

const FRAME = 16;

// Runs frames of 16 ms for `milliseconds`, from `start`, with `focus`.
function run(
	fades: Fades,
	frames: { start: number; milliseconds: number },
	focus: GraphPoint | undefined,
): number {
	let now = frames.start;
	for (; now < frames.start + frames.milliseconds; now += FRAME) {
		fades.begin(now, focus);
	}
	return now;
}

describe('Fades', () => {
	it('fades the others in about 200 ms, not at once', () => {
		const fades = new Fades();
		const focus = note('A');
		fades.begin(0, undefined);
		fades.begin(FRAME, focus);
		expect(fades.level).toBeGreaterThan(0);
		expect(fades.level).toBeLessThan(0.5);
		run(fades, { start: 2 * FRAME, milliseconds: 400 }, focus);
		expect(fades.level).toBe(1);
		expect(fades.isMoving).toBe(false);
	});

	it('still fades after a long pause', () => {
		const fades = new Fades();
		fades.begin(0, undefined);
		fades.begin(10_000, note('A'));
		expect(fades.level).toBeLessThan(0.5);
	});

	it('crosses the links of one note over to the next', () => {
		const fades = new Fades();
		const first = note('A');
		const second = note('B');
		const now = run(fades, { start: 0, milliseconds: 400 }, first);
		fades.begin(now, second);
		const links = fades.links();
		expect(links.get(first)).toBeLessThan(1);
		expect(links.get(first)).toBeGreaterThan(0.5);
		expect(links.get(second)).toBeLessThan(0.5);
		run(fades, { start: now + FRAME, milliseconds: 400 }, second);
		expect(fades.links().has(first)).toBe(false);
		expect(fades.links().get(second)).toBe(1);
	});

	it('fades a title out once it is no longer written', () => {
		const fades = new Fades();
		const point = note('A');
		let now = 0;
		for (; now < 400; now += FRAME) {
			fades.begin(now, undefined);
			fades.title(point, 1);
		}
		fades.begin(now, undefined);
		const [leaving] = [...fades.leaving()];
		expect(leaving?.[0]).toBe(point);
		expect(leaving?.[1]).toBeGreaterThan(0.5);
		for (now += FRAME; now < 800; now += FRAME) {
			fades.begin(now, undefined);
			[...fades.leaving()].forEach(() => undefined);
		}
		expect([...fades.leaving()]).toEqual([]);
	});
});
