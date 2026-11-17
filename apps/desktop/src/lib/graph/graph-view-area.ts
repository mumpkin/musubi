// SPDX-License-Identifier: GPL-3.0-or-later
// The part of the graph in view, in graph units: what lies outside is not
// drawn.
import type { ZoomTransform } from 'd3-zoom';

import type { GraphPoint } from './graph-data.ts';

export interface Area {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

// Room kept around the view, in screen pixels: a note just outside may
// still show its edge or its title.
const VIEW_MARGIN = 120;

export function viewArea(
	transform: ZoomTransform,
	size: { width: number; height: number },
): Area {
	const margin = VIEW_MARGIN / transform.k;
	return {
		left: transform.invertX(0) - margin,
		top: transform.invertY(0) - margin,
		right: transform.invertX(size.width) + margin,
		bottom: transform.invertY(size.height) + margin,
	};
}

export function isInside(area: Area, point: GraphPoint): boolean {
	const across = point.x ?? 0;
	const down = point.y ?? 0;
	return across >= area.left
		&& across <= area.right
		&& down >= area.top
		&& down <= area.bottom;
}
