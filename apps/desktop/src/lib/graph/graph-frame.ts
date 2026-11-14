// SPDX-License-Identifier: GPL-3.0-or-later
// The view that shows every note of the graph at once.
import { zoomIdentity, type ZoomTransform } from 'd3-zoom';

import { boundsOf, type GraphPoint } from './graph-data.ts';

// Room around the notes, in screen pixels.
const FRAME_MARGIN = 60;
// A few notes are not blown up.
const MAX_FRAME_ZOOM = 2;
const HALF = 2;

// The zoom and position that fit `points` in a view of `width` by
// `height` screen pixels; `undefined` for no notes.
export function frameOf(
	points: GraphPoint[],
	width: number,
	height: number,
): ZoomTransform | undefined {
	const bounds = boundsOf(points);
	if (!bounds) {
		return undefined;
	}
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
