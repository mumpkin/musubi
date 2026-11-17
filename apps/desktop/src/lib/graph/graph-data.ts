// SPDX-License-Identifier: GPL-3.0-or-later
// The graph of the vault, as the simulation of `d3-force` moves it.
import { invoke } from '@tauri-apps/api/core';
import type { SimulationLinkDatum, SimulationNodeDatum } from 'd3-force';

import type { Graph } from '../bindings/Graph.ts';

export interface GraphPoint extends SimulationNodeDatum {
	path: string;
	title: string;
	// Links to and from the note.
	degree: number;
	radius: number;
	// Half the size of the note drawn as a pill; unset for a dot.
	halfWidth?: number | undefined;
	halfHeight?: number | undefined;
}

export type GraphEdge = SimulationLinkDatum<GraphPoint>;

export interface GraphModel {
	points: GraphPoint[];
	edges: GraphEdge[];
}

const BASE_RADIUS = 3;
const FULL_TURN = Math.PI + Math.PI;

// Bigger nodes for notes with more links, growing slowly.
export function radiusFor(degree: number): number {
	return BASE_RADIUS + Math.sqrt(degree);
}

// Keeps `point` where `old`, the same note, was.
export function keepPosition(point: GraphPoint, old: GraphPoint): void {
	// `x` and `y` are the names d3-force gives positions.
	/* eslint-disable id-length */
	point.x = old.x;
	point.y = old.y;
	/* eslint-enable id-length */
}

// Puts the notes of `next` already in `previous` where they were; returns
// how many were.
export function carryPositions(
	previous: GraphModel,
	next: GraphModel,
): number {
	const known = new Map(previous.points.map((point) => [point.path, point]));
	let carried = 0;
	for (const point of next.points) {
		const old = known.get(point.path);
		if (old?.x !== undefined) {
			keepPosition(point, old);
			carried += 1;
		}
	}
	return carried;
}

export function toModel(graph: Graph): GraphModel {
	const degrees = graph.nodes.map(() => 0);
	for (const { source, target } of graph.links) {
		degrees[source] = (degrees[source] ?? 0) + 1;
		degrees[target] = (degrees[target] ?? 0) + 1;
	}
	const points = graph.nodes.map((node, index) => {
		const degree = degrees[index] ?? 0;
		return { ...node, degree, radius: radiusFor(degree) };
	});
	const edges = graph.links.map(({ source, target }) => ({ source, target }));
	return { points, edges };
}

// The notes of the vault and their links.
export async function readGraph(): Promise<Graph> {
	return invoke<Graph>('vault_graph');
}

// How far `across`, `down` (graph coordinates) is from the note as drawn,
// its disc or its pill: 0 or less on it.
function gapTo(point: GraphPoint, across: number, down: number): number {
	const awayAcross = Math.abs((point.x ?? 0) - across);
	const awayDown = Math.abs((point.y ?? 0) - down);
	if (point.halfWidth !== undefined && point.halfHeight !== undefined) {
		return Math.hypot(
			Math.max(awayAcross - point.halfWidth, 0),
			Math.max(awayDown - point.halfHeight, 0),
		);
	}
	return Math.hypot(awayAcross, awayDown) - point.radius;
}

// The note drawn at `across`, `down` (graph coordinates): the last drawn,
// on top, wins. Off every note, the nearest one within `slack` graph units,
// so that small dots stay easy to hit.
export function pointUnder(
	points: GraphPoint[],
	{ across, down }: { across: number; down: number },
	slack = 0,
): GraphPoint | undefined {
	const onTop = points.findLast((point) => gapTo(point, across, down) <= 0);
	if (onTop || slack <= 0) {
		return onTop;
	}
	let nearest: GraphPoint | undefined;
	let best = slack;
	for (const point of points) {
		const gap = gapTo(point, across, down);
		if (gap <= best) {
			best = gap;
			nearest = point;
		}
	}
	return nearest;
}

// The path of an end of a link: an index before the simulation reads the
// links, the note itself after.
function pathOfEnd(end: GraphEdge['source'], model: GraphModel): string {
	if (typeof end === 'object') {
		return end.path;
	}
	return model.points[Number(end)]?.path ?? '';
}

// Whether `next` shows the same notes and links as `previous`: laying it
// out again would only move them for nothing.
export function sameNotes(previous: GraphModel, next: GraphModel): boolean {
	const samePoints = previous.points.length === next.points.length
		&& previous.points.every(
			(point, index) => point.path === next.points[index]?.path,
		);
	return samePoints
		&& previous.edges.length === next.edges.length
		&& previous.edges.every((edge, index) => {
			const other = next.edges[index];
			const ends = (end: GraphEdge['source'], model: GraphModel) =>
				pathOfEnd(end, model);
			return other !== undefined
				&& ends(edge.source, previous) === ends(other.source, next)
				&& ends(edge.target, previous) === ends(other.target, next);
		});
}

// The notes linked to each note of `model`.
export function neighboursOf(
	model: GraphModel,
): Map<GraphPoint, Set<GraphPoint>> {
	const neighbours = new Map<GraphPoint, Set<GraphPoint>>(
		model.points.map((point) => [point, new Set()]),
	);
	const pointOf = (end: GraphEdge['source']) =>
		typeof end === 'object' ? end : model.points[Number(end)];
	for (const edge of model.edges) {
		const source = pointOf(edge.source);
		const target = pointOf(edge.target);
		if (source && target) {
			neighbours.get(source)?.add(target);
			neighbours.get(target)?.add(source);
		}
	}
	return neighbours;
}

// Room around a note placed next to a linked one, in graph units.
const NEAR = 20;

// Puts each note of `model` without a position next to a linked note that
// has one: a note that appears does not fly in from the middle.
export function placeNearNeighbours(model: GraphModel): void {
	const neighbours = neighboursOf(model);
	for (const point of model.points) {
		if (point.x !== undefined) {
			continue;
		}
		const placed = [...(neighbours.get(point) ?? [])]
			.find((other) => other.x !== undefined);
		if (placed) {
			const angle = Math.random() * FULL_TURN;
			keepPosition(point, {
				...placed,
				// eslint-disable-next-line id-length
				x: (placed.x ?? 0) + Math.cos(angle) * NEAR,
				// eslint-disable-next-line id-length
				y: (placed.y ?? 0) + Math.sin(angle) * NEAR,
			});
		}
	}
}

export interface Bounds {
	left: number;
	top: number;
	width: number;
	height: number;
}

// The box around every note, or `undefined` for an empty graph.
export function boundsOf(points: GraphPoint[]): Bounds | undefined {
	if (points.length === 0) {
		return undefined;
	}
	const across = points.map((point) => point.x ?? 0);
	const down = points.map((point) => point.y ?? 0);
	const left = Math.min(...across);
	const top = Math.min(...down);
	return {
		left,
		top,
		width: Math.max(...across) - left,
		height: Math.max(...down) - top,
	};
}
