// SPDX-License-Identifier: GPL-3.0-or-later
// Options of the graph, kept on this device: the shape of the notes (dots
// with the title below, or pills with the title inside) and whether the
// notes of a folder are grouped together.
import type { GraphPoint } from './graph-data.ts';

export type NodeShape = 'dot' | 'pill';

const SHAPE_KEY = 'musubi.graph.nodeShape';
const GROUPS_KEY = 'musubi.graph.folderGroups';

// Size of the pills, in units of the graph (one unit is a screen pixel at
// zoom 1).
export const PILL_FONT_SIZE = 9;
export const PILL_FONT = `${String(PILL_FONT_SIZE)}px system-ui, sans-serif`;
const PILL_PADDING = 6;
const PILL_HALF_HEIGHT = 8;
const HALF = 2;

class GraphOptions {
	shape = $state<NodeShape>(
		localStorage.getItem(SHAPE_KEY) === 'pill' ? 'pill' : 'dot',
	);

	isGrouped = $state(localStorage.getItem(GROUPS_KEY) === 'true');

	setShape(shape: NodeShape): void {
		this.shape = shape;
		localStorage.setItem(SHAPE_KEY, shape);
	}

	setGrouped(isGrouped: boolean): void {
		this.isGrouped = isGrouped;
		localStorage.setItem(GROUPS_KEY, String(isGrouped));
	}
}

export const graphOptions = new GraphOptions();

let measuring: CanvasRenderingContext2D | null | undefined;

// The width of `text` in the font of the pills.
function textWidth(text: string): number {
	measuring ??= document.createElement('canvas').getContext('2d');
	if (!measuring) {
		return text.length * PILL_FONT_SIZE;
	}
	measuring.font = PILL_FONT;
	return measuring.measureText(text).width;
}

// Gives each note the size of its pill, or back the one of its dot.
export function shapePoints(points: GraphPoint[], shape: NodeShape): void {
	for (const point of points) {
		if (shape === 'pill') {
			point.halfWidth = textWidth(point.title) / HALF + PILL_PADDING;
			point.halfHeight = PILL_HALF_HEIGHT;
		} else {
			point.halfWidth = undefined;
			point.halfHeight = undefined;
		}
	}
}
