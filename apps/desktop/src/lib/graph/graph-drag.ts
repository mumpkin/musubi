// SPDX-License-Identifier: GPL-3.0-or-later
// Dragging a note of the graph: it follows the pointer, with the notes of
// its folder group when grouped. Only the notes around it move: the others
// are held in place until the layout settles, so that a drag, let alone a
// click, does not shake the whole graph. Elsewhere the pointer pans the
// view.
import { type D3DragEvent, drag, type DragBehavior } from 'd3-drag';
import type { Simulation } from 'd3-force';
import type { ZoomTransform } from 'd3-zoom';

import type { GraphEdge, GraphPoint } from './graph-data.ts';

// How much the notes around a dragged one move (`alpha` of d3-force).
const REHEAT = 0.3;
// A press that moves less than this, in screen pixels, is a click.
const CLICK_DISTANCE = 3;

// `x` and `y` are where d3-drag reads the start of a drag.
interface DragSubject {
	point: GraphPoint;
	x: number;
	y: number;
}

type DragEvent = D3DragEvent<HTMLCanvasElement, unknown, DragSubject>;

// What the drag reads from the graph view, as it is at each event.
export interface DragContext {
	transform: () => ZoomTransform;
	simulation: () => Simulation<GraphPoint, GraphEdge> | undefined;
	// The note under a point of the canvas, in CSS pixels.
	pointAt: (left: number, top: number) => GraphPoint | undefined;
	// The notes that move along with a dragged one: its folder group.
	groupOf: (point: GraphPoint) => GraphPoint[];
	// The notes free to move while `point` is dragged.
	freeAround: (point: GraphPoint) => ReadonlySet<GraphPoint>;
}

// Moves `members` as `point` moves to `across`, `down`: the group keeps
// its shape instead of stretching.
function carry(
	point: GraphPoint,
	members: GraphPoint[],
	to: { across: number; down: number },
): void {
	const shiftAcross = to.across - (point.fx ?? point.x ?? to.across);
	const shiftDown = to.down - (point.fy ?? point.y ?? to.down);
	// `x` and `y` are the names d3-force gives positions.
	/* eslint-disable id-length */
	for (const member of members) {
		member.x = (member.x ?? 0) + shiftAcross;
		member.y = (member.y ?? 0) + shiftDown;
	}
	/* eslint-enable id-length */
}

// The notes held in place during a drag, released once the layout
// settles.
class Holds {
	private held: GraphPoint[] = [];

	hold(points: GraphPoint[], free: ReadonlySet<GraphPoint>): void {
		this.release();
		for (const point of points) {
			if (!free.has(point) && point.fx == null) {
				point.fx = point.x;
				point.fy = point.y;
				this.held.push(point);
			}
		}
	}

	// Holds `point` where it is too, until the layout settles.
	keep(point: GraphPoint): void {
		this.held.push(point);
	}

	release(): void {
		for (const point of this.held) {
			point.fx = null;
			point.fy = null;
		}
		this.held = [];
	}
}

// One press on a note: a click, or a drag once it moves far enough.
class Press {
	private readonly holds = new Holds();
	private isMoving = false;
	private pressedAt: [number, number] = [0, 0];
	private readonly context: DragContext;

	constructor(context: DragContext) {
		this.context = context;
	}

	begin(event: DragEvent): void {
		this.isMoving = false;
		this.pressedAt = [event.x, event.y];
	}

	move(event: DragEvent): void {
		const [fromAcross, fromDown] = this.pressedAt;
		const distance = Math.hypot(event.x - fromAcross, event.y - fromDown);
		if (!this.isMoving && distance > CLICK_DISTANCE) {
			this.isMoving = true;
			this.wake(event.subject.point);
		}
		if (this.isMoving) {
			this.follow(event);
		}
	}

	// A dropped note stays under the pointer while the notes around it
	// settle, then is free again.
	finish(event: DragEvent): void {
		const { point } = event.subject;
		if (this.isMoving) {
			this.holds.keep(point);
			this.context.simulation()?.alphaTarget(0);
			return;
		}
		point.fx = null;
		point.fy = null;
	}

	// The first move of a drag wakes the notes around the dragged one.
	private wake(point: GraphPoint): void {
		const simulation = this.context.simulation();
		this.holds.hold(
			simulation?.nodes() ?? [],
			this.context.freeAround(point),
		);
		simulation?.on('end.holds', () => {
			this.holds.release();
		});
		simulation?.alphaTarget(REHEAT).restart();
	}

	private follow(event: DragEvent): void {
		const { transform, groupOf } = this.context;
		const [across, down] = transform().invert([event.x, event.y]);
		const { point } = event.subject;
		carry(point, groupOf(point), { across, down });
		point.fx = across;
		point.fy = down;
	}
}

export function dragging(
	target: HTMLCanvasElement,
	context: DragContext,
): DragBehavior<HTMLCanvasElement, unknown, DragSubject | undefined> {
	const press = new Press(context);
	return drag<HTMLCanvasElement, unknown, DragSubject | undefined>()
		.container(target)
		.subject((event: DragSubject) => {
			const point = context.pointAt(event.x, event.y);
			return point && { ...event, point };
		})
		.clickDistance(CLICK_DISTANCE)
		.on('start', (event: DragEvent) => {
			press.begin(event);
		})
		.on('drag', (event: DragEvent) => {
			press.move(event);
		})
		.on('end', (event: DragEvent) => {
			press.finish(event);
		});
}
