// SPDX-License-Identifier: GPL-3.0-or-later
// Pills of the graph do not overlap: two pills that cover each other are
// pushed apart, sideways or up and down after where they sit. A circle as
// wide as a pill would keep its neighbours far above and below it.
import type { Force } from 'd3-force';
import { type Quadtree, quadtree, type QuadtreeLeaf } from 'd3-quadtree';

import type { GraphEdge, GraphPoint } from './graph-data.ts';

// Room between two pills, and how much of an overlap a step removes.
const PILL_GAP = 4;
const STRENGTH = 0.7;
const HALF = 2;

interface Box {
	across: number;
	down: number;
	halfWidth: number;
	halfHeight: number;
}

function boxOf(point: GraphPoint): Box {
	return {
		across: point.x ?? 0,
		down: point.y ?? 0,
		halfWidth: (point.halfWidth ?? point.radius) + PILL_GAP / HALF,
		halfHeight: (point.halfHeight ?? point.radius) + PILL_GAP / HALF,
	};
}

// Pushes `first` and `second` apart if their boxes overlap.
function separate(first: GraphPoint, second: GraphPoint): void {
	const one = boxOf(first);
	const other = boxOf(second);
	const across = other.across - one.across;
	const down = other.down - one.down;
	const overlapAcross = one.halfWidth + other.halfWidth - Math.abs(across);
	const overlapDown = one.halfHeight + other.halfHeight - Math.abs(down);
	if (overlapAcross <= 0 || overlapDown <= 0) {
		return;
	}
	// Out the side the other pill is on, for the size of the pills: a pill
	// beside another moves aside, one below moves down.
	const sideways = Math.abs(across) / (one.halfWidth + other.halfWidth)
		> Math.abs(down) / (one.halfHeight + other.halfHeight);
	if (sideways) {
		const push = (overlapAcross / HALF) * STRENGTH * Math.sign(across || 1);
		first.vx = (first.vx ?? 0) - push;
		second.vx = (second.vx ?? 0) + push;
	} else {
		const push = (overlapDown / HALF) * STRENGTH * Math.sign(down || 1);
		first.vy = (first.vy ?? 0) - push;
		second.vy = (second.vy ?? 0) + push;
	}
}

// The pills that come after `point` in the leaves of a quadtree node.
function separateLeaves(
	point: GraphPoint,
	node: QuadtreeLeaf<GraphPoint> | undefined,
): void {
	let leaf = node;
	while (leaf) {
		if ((leaf.data.index ?? 0) > (point.index ?? 0)) {
			separate(point, leaf.data);
		}
		leaf = leaf.next;
	}
}

const across = (point: GraphPoint): number => point.x ?? 0;
const down = (point: GraphPoint): number => point.y ?? 0;

// Separates `point` from the pills near it, found in `tree`.
function separateFrom(
	tree: Quadtree<GraphPoint>,
	point: GraphPoint,
	largest: { halfWidth: number; halfHeight: number },
): void {
	const box = boxOf(point);
	const reachAcross = box.halfWidth + largest.halfWidth;
	const reachDown = box.halfHeight + largest.halfHeight;
	// d3 gives the node, then its left, top, right and bottom edges.
	tree.visit((node, ...edges) => {
		if (!('length' in node)) {
			separateLeaves(point, node);
		}
		const [left, top, right, bottom] = edges;
		return left > box.across + reachAcross
			|| right < box.across - reachAcross
			|| top > box.down + reachDown
			|| bottom < box.down - reachDown;
	});
}

export function pillCollide(): Force<GraphPoint, GraphEdge> {
	let points: GraphPoint[] = [];
	const force = (): void => {
		const boxes = points.map(boxOf);
		const largest = {
			halfWidth: Math.max(0, ...boxes.map((box) => box.halfWidth)),
			halfHeight: Math.max(0, ...boxes.map((box) => box.halfHeight)),
		};
		const tree = quadtree(points, across, down);
		for (const point of points) {
			separateFrom(tree, point, largest);
		}
	};
	force.initialize = (nodes: GraphPoint[]): void => {
		points = nodes;
	};
	return force;
}
