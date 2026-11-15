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

import { pillCollide } from './graph-collide.ts';
import type { GraphEdge, GraphModel, GraphPoint } from './graph-data.ts';
import { folderOf } from './graph-filter.ts';
import { folderGroups } from './graph-group-force.ts';

const LINK_DISTANCE = 40;
const REPULSION = -60;
// Beyond this distance notes stop pushing: faster on large vaults.
const REPULSION_RANGE = 400;
const CENTRE_PULL = 0.04;
const COLLISION_GAP = 2;
const TITLE_ROOM = 12;
// Pull of a note towards the centre of its folder, when grouped.
// Grouped, a stronger pull to the middle packs the groups together.
const GROUP_GRAVITY = 0.03;
// Grouped, notes only push their close neighbours: each cluster stays
// in its circle.
const GROUP_REPULSION = -40;
const GROUP_REPULSION_RANGE = 80;
// Pull of a link between two folders, when grouped: still drawn, it no
// longer drags a group into another.
const CROSS_LINK_PULL = 0.02;

// Dots are circles; pills are pushed apart as the rounded boxes they are.
// Grouped, dots keep room for their titles.
function collision(model: GraphModel, isGrouped: boolean) {
	const isPills = model.points.some((point) => point.halfWidth !== undefined);
	const room = isGrouped ? TITLE_ROOM : COLLISION_GAP;
	return isPills
		? pillCollide()
		: forceCollide<GraphPoint>((point) => point.radius + room);
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

// Lays out `model`; grouped below the folder `groupBase`, the notes of
// each folder gather in nested circles.
export function simulate(
	model: GraphModel,
	groupBase: string | undefined,
): Simulation<GraphPoint, GraphEdge> {
	const isGrouped = groupBase !== undefined;
	const pull = isGrouped ? GROUP_GRAVITY : CENTRE_PULL;
	return forceSimulation(model.points)
		.force('link', links(model, isGrouped))
		.force('charge', repulsion(isGrouped))
		.force('x', forceX<GraphPoint>(0).strength(pull))
		.force('y', forceY<GraphPoint>(0).strength(pull))
		.force('groups', isGrouped ? folderGroups(groupBase) : null)
		.force('collide', collision(model, isGrouped));
}
