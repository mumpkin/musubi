// SPDX-License-Identifier: GPL-3.0-or-later
// The notes of the graph and the simulation that lays them out. Showing
// the same notes again moves nothing: selecting a note keeps the layout
// still. Notes already shown keep their place when the notes change.
import type { Simulation } from 'd3-force';
import type { ZoomTransform } from 'd3-zoom';

import {
	carryPositions,
	type GraphEdge,
	type GraphModel,
	type GraphPoint,
	neighboursOf,
	placeNearNeighbours,
	pointUnder,
	sameNotes,
} from './graph-data.ts';
import { groupMembers } from './graph-groups.ts';
import type { NodeShape } from './graph-options.svelte.ts';
import { simulate } from './graph-simulation.ts';

// How much a layout moves when most of its notes keep their place
// (`alpha` of d3-force, 1 for a new layout).
const REFIT = 0.3;
// Time spent on extra steps of the simulation each frame, so that a large
// graph settles in a few seconds.
const STEP_BUDGET_MILLISECONDS = 8;
const HALF = 2;
// How far from a dot a click still hits it, in screen pixels.
const HIT_SLACK = 6;

export interface LayoutRequest {
	model: GraphModel;
	groupBase: string | undefined;
	shape: NodeShape;
}

export class GraphLayout {
	model: GraphModel = { points: [], edges: [] };
	simulation: Simulation<GraphPoint, GraphEdge> | undefined;
	neighbours = new Map<GraphPoint, Set<GraphPoint>>();
	// The notes, most linked first: their titles show first.
	byDegree: GraphPoint[] = [];
	private groupBase: string | undefined;
	private shape: NodeShape | undefined;
	private readonly onTick: () => void;

	constructor(onTick: () => void) {
		this.onTick = onTick;
	}

	// Lays out the notes of `request`; returns `false`, moving nothing,
	// when they are the ones shown, grouped and shaped the same.
	show(request: LayoutRequest): boolean {
		const { model, groupBase, shape } = request;
		if (
			groupBase === this.groupBase
			&& shape === this.shape
			&& sameNotes(this.model, model)
		) {
			return false;
		}
		const carried = carryPositions(this.model, model);
		placeNearNeighbours(model);
		this.model = model;
		this.groupBase = groupBase;
		this.shape = shape;
		this.neighbours = neighboursOf(model);
		this.byDegree = model.points.toSorted(
			(one, other) => other.degree - one.degree,
		);
		this.simulation?.stop();
		const isMostlyKnown = carried > model.points.length / HALF;
		this.simulation = simulate(model, groupBase)
			.alpha(isMostlyKnown ? REFIT : 1)
			.on('tick', () => {
				this.catchUp();
				this.onTick();
			});
		return true;
	}

	// Extra steps within the budget of a frame, unless a note is dragged.
	private catchUp(): void {
		const simulation = this.simulation;
		// While a note is dragged, the layout follows the pointer at its pace.
		if (!simulation || simulation.alphaTarget() > 0) {
			return;
		}
		const start = performance.now();
		while (
			simulation.alpha() > simulation.alphaMin()
			&& performance.now() - start < STEP_BUDGET_MILLISECONDS
		) {
			simulation.tick();
		}
	}

	// The note at `place` on the canvas (CSS pixels), or the nearest one
	// within a few pixels.
	pointAt(
		transform: ZoomTransform,
		place: [number, number],
	): GraphPoint | undefined {
		const [across, down] = transform.invert(place);
		return pointUnder(
			this.model.points,
			{ across, down },
			HIT_SLACK / transform.k,
		);
	}

	// The notes that move while `point` is dragged: itself, its folder
	// group below `groupBase`, the notes it is linked to.
	freeAround(
		point: GraphPoint,
		groupBase: string | undefined,
	): ReadonlySet<GraphPoint> {
		return new Set([
			point,
			...groupMembers(this.model.points, point, groupBase),
			...(this.neighbours.get(point) ?? []),
		]);
	}

	stop(): void {
		this.simulation?.stop();
	}
}
