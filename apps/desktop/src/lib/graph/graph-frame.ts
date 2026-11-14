// SPDX-License-Identifier: GPL-3.0-or-later
// The view that shows every note of the graph at once.
import { zoomIdentity, type ZoomTransform } from 'd3-zoom';

import { type Bounds, boundsOf, type GraphPoint } from './graph-data.ts';
import type { GroupLayout } from './graph-groups.ts';

// Room around the notes, in screen pixels.
const FRAME_MARGIN = 60;
// A few notes are not blown up.
const MAX_FRAME_ZOOM = 2;
const HALF = 2;

// `bounds` grown to hold the circle of the whole vault.
function withGroups(bounds: Bounds, groups: GroupLayout): Bounds {
	const left = Math.min(bounds.left, -groups.radius);
	const top = Math.min(bounds.top, -groups.radius);
	const right = Math.max(bounds.left + bounds.width, groups.radius);
	const bottom = Math.max(bounds.top + bounds.height, groups.radius);
	return { left, top, width: right - left, height: bottom - top };
}

// The zoom and position that fit `points`, and the circles of their
// folders when grouped, in a view of `size` screen pixels; `undefined` for
// no notes.
export function frameOf(
	points: GraphPoint[],
	size: { width: number; height: number },
	groups: GroupLayout | undefined,
): ZoomTransform | undefined {
	const notes = boundsOf(points);
	if (!notes) {
		return undefined;
	}
	const bounds = groups ? withGroups(notes, groups) : notes;
	const { width, height } = size;
	const scale = Math.min(
		MAX_FRAME_ZOOM,
		(width - FRAME_MARGIN) / Math.max(bounds.width, 1),
		(height - FRAME_MARGIN) / Math.max(bounds.height, 1),
	);
	return zoomIdentity
		.translate(width / HALF, height / HALF)
		.scale(scale)
		.translate(
			-(bounds.left + bounds.width / HALF),
			-(bounds.top + bounds.height / HALF),
		);
}
