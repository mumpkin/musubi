// SPDX-License-Identifier: GPL-3.0-or-later
// Smooth changes of the graph: the titles and links of the other notes
// fade when a note stands out, the links of that note fade in, titles fade
// in and out as they come and go. Nothing changes at once, which is hard on
// the eyes; the notes themselves keep their color.
import type { GraphPoint } from './graph-data.ts';

// Time for a fade to cover about two thirds of its way, in milliseconds:
// a change looks done after some 200 ms.
const TAU = 70;
// A frame never counts for more than this, so that a change after a pause
// still fades.
const LONGEST_FRAME = 32;
// Closer than this to its target, a fade ends.
const DONE = 0.01;

export class Fades {
	// How much the notes other than the one that stands out fade, 0 to 1.
	level = 0;
	// The scene still changes: another frame is needed.
	isMoving = false;
	// How strongly each title is written, and the links of each note drawn
	// over the others.
	private readonly titles = new Map<GraphPoint, number>();
	private readonly focusLinks = new Map<GraphPoint, number>();
	private readonly seen = new Set<GraphPoint>();
	private last: number | undefined;
	private factor = 1;

	// Starts a frame drawn at `now` (milliseconds), with `focus` standing
	// out.
	begin(now: number, focus: GraphPoint | undefined): void {
		const elapsed = Math.min(now - (this.last ?? now), LONGEST_FRAME);
		this.last = now;
		this.factor = 1 - Math.exp(-elapsed / TAU);
		this.isMoving = false;
		this.seen.clear();
		this.level = this.approach(this.level, focus ? 1 : 0);
		if (focus && !this.focusLinks.has(focus)) {
			this.focusLinks.set(focus, 0);
		}
		for (const [point, weight] of this.focusLinks) {
			const next = this.approach(weight, point === focus ? 1 : 0);
			if (next === 0 && point !== focus) {
				this.focusLinks.delete(point);
			} else {
				this.focusLinks.set(point, next);
			}
		}
	}

	// The notes whose links are drawn over the others, and how strongly.
	links(): ReadonlyMap<GraphPoint, number> {
		return this.focusLinks;
	}

	// How strongly to write the title of `point` this frame, on its way to
	// `target`.
	title(point: GraphPoint, target: number): number {
		const next = this.approach(this.titles.get(point) ?? 0, target);
		this.titles.set(point, next);
		this.seen.add(point);
		return next;
	}

	// Titles written before but not this frame, fading out.
	* leaving(): Generator<[GraphPoint, number]> {
		for (const [point, strength] of this.titles) {
			if (this.seen.has(point)) {
				continue;
			}
			const next = this.approach(strength, 0);
			if (next === 0) {
				this.titles.delete(point);
			} else {
				this.titles.set(point, next);
				yield [point, next];
			}
		}
	}

	private approach(value: number, target: number): number {
		const next = value + (target - value) * this.factor;
		if (Math.abs(target - next) < DONE) {
			return target;
		}
		this.isMoving = true;
		return next;
	}
}
