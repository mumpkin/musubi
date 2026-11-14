// SPDX-License-Identifier: GPL-3.0-or-later
// The forces that lay out the graph: links pull, notes push each other
// away, and a weak pull to the centre keeps lone notes in view, or to the
// centre of their folder when the notes are grouped.
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
import { folderOf } from './graph-filter.ts';
import type { GroupLayout } from './graph-groups.ts';

const LINK_DISTANCE = 40;
const REPULSION = -60;
// Beyond this distance notes stop pushing: faster on large vaults.
const REPULSION_RANGE = 400;
const CENTRE_PULL = 0.04;
const COLLISION_GAP = 2;
// Pull of a note towards the centre of its folder, when grouped.
const GROUP_PULL = 0.2;
// Grouped, notes only push their close neighbours: each cluster stays
// in its circle.
const GROUP_REPULSION = -30;
const GROUP_REPULSION_RANGE = 60;
// Pull of a link between two folders, when grouped: still drawn, it no
// longer drags a group into another.
const CROSS_LINK_PULL = 0.02;

// Pulls each note to the middle, or to the cluster of its folder when the
// notes are grouped.
function pulls(groups: GroupLayout | undefined) {
	if (!groups) {
		return {
			across: forceX<GraphPoint>(0).strength(CENTRE_PULL),
			down: forceY<GraphPoint>(0).strength(CENTRE_PULL),
		};
	}
	const centreOf = (point: GraphPoint) =>
		groups.clusters.get(folderOf(point.path));
	return {
		across: forceX<GraphPoint>((point) => centreOf(point)?.across ?? 0)
			.strength(GROUP_PULL),
		down: forceY<GraphPoint>((point) => centreOf(point)?.down ?? 0)
			.strength(GROUP_PULL),
	};
}

function repulsion(isGrouped: boolean) {
	return forceManyBody<GraphPoint>()
		.strength(isGrouped ? GROUP_REPULSION : REPULSION)
		.distanceMax(isGrouped ? GROUP_REPULSION_RANGE : REPULSION_RANGE);
}

function folderOfEnd(end: GraphEdge['source']): string | undefined {
	return typeof end === 'object' ? folderOf(end.path) : undefined;
}

function links(model: GraphModel, isGrouped: boolean) {
	const force = forceLink<GraphPoint, GraphEdge>(model.edges)
		.distance(LINK_DISTANCE);
	if (!isGrouped) {
		return force;
	}
	const usual = force.strength();
	return force.strength((edge, index, edges) => {
		const isAcross = folderOfEnd(edge.source) !== folderOfEnd(edge.target);
		return isAcross ? CROSS_LINK_PULL : usual(edge, index, edges);
	});
}

// Lays out `model`, around the nested circles of `groups` when the notes
// are grouped by folder.
export function simulate(
	model: GraphModel,
	groups: GroupLayout | undefined,
): Simulation<GraphPoint, GraphEdge> {
	const pull = pulls(groups);
	const isGrouped = groups !== undefined;
	return forceSimulation(model.points)
		.force('link', links(model, isGrouped))
		.force('charge', repulsion(isGrouped))
		.force('x', pull.across)
		.force('y', pull.down)
		.force(
			'collide',
			forceCollide<GraphPoint>(
				(point) => (point.halfWidth ?? point.radius) + COLLISION_GAP,
			),
		);
}
