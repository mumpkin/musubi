// SPDX-License-Identifier: GPL-3.0-or-later
// Dragging a note of the graph: it follows the pointer, with the notes of
// its folder group when grouped, and the layout moves around it; elsewhere
// the pointer pans the view.
import { type D3DragEvent, drag, type DragBehavior } from 'd3-drag';
import type { Simulation } from 'd3-force';
import type { ZoomTransform } from 'd3-zoom';

import type { GraphEdge, GraphPoint } from './graph-data.ts';

// How much the layout moves again while a note is dragged (`alpha` of
// d3-force).
const REHEAT = 0.3;

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

export function dragging(
	target: HTMLCanvasElement,
	context: DragContext,
): DragBehavior<HTMLCanvasElement, unknown, DragSubject | undefined> {
	const moveTo = (event: DragEvent): void => {
		const [across, down] = context.transform().invert([event.x, event.y]);
		const { point } = event.subject;
		carry(point, context.groupOf(point), { across, down });
		point.fx = across;
		point.fy = down;
	};
	return drag<HTMLCanvasElement, unknown, DragSubject | undefined>()
		.container(target)
		.subject((event: DragSubject) => {
			const point = context.pointAt(event.x, event.y);
			return point && { ...event, point };
		})
		.on('start', (event: DragEvent) => {
			context.simulation()?.alphaTarget(REHEAT).restart();
			moveTo(event);
		})
		.on('drag', moveTo)
		.on('end', (event: DragEvent) => {
			context.simulation()?.alphaTarget(0);
			event.subject.point.fx = null;
			event.subject.point.fy = null;
		});
}
