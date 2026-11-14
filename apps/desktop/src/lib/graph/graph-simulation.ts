// SPDX-License-Identifier: GPL-3.0-or-later
// The forces that lay out the graph: links pull, notes push each other
// away, and a weak pull to the centre keeps lone notes in view.
import {
	forceCollide,
	forceLink,
	forceManyBody,
	forceSimulation,
	forceX,
	forceY,
	type Simulation,
} from 'd3-force';

import type { GraphEdge, GraphModel, GraphPoint } from './graph-data.ts';

const LINK_DISTANCE = 40;
const REPULSION = -60;
// Beyond this distance notes stop pushing: faster on large vaults.
const REPULSION_RANGE = 400;
const CENTRE_PULL = 0.04;
const COLLISION_GAP = 2;

export function simulate(
	model: GraphModel,
): Simulation<GraphPoint, GraphEdge> {
	return forceSimulation(model.points)
		.force(
			'link',
			forceLink<GraphPoint, GraphEdge>(model.edges)
				.distance(LINK_DISTANCE),
		)
		.force(
			'charge',
			forceManyBody<GraphPoint>()
				.strength(REPULSION)
				.distanceMax(REPULSION_RANGE),
		)
		.force('x', forceX<GraphPoint>(0).strength(CENTRE_PULL))
		.force('y', forceY<GraphPoint>(0).strength(CENTRE_PULL))
		.force(
			'collide',
			forceCollide<GraphPoint>(
				(point) => (point.halfWidth ?? point.radius) + COLLISION_GAP,
			),
		);
}
