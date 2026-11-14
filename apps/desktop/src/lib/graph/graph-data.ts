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
}

export type GraphEdge = SimulationLinkDatum<GraphPoint>;

export interface GraphModel {
	points: GraphPoint[];
	edges: GraphEdge[];
}

const BASE_RADIUS = 3;

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

// The note drawn at `across`, `down` (graph coordinates): the pointer must
// be on its disc. The last drawn, on top, wins.
export function pointUnder(
	points: GraphPoint[],
	across: number,
	down: number,
): GraphPoint | undefined {
	return points.findLast((point) => {
		const distance = Math.hypot(
			(point.x ?? 0) - across,
			(point.y ?? 0) - down,
		);
		return distance <= point.radius;
	});
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
