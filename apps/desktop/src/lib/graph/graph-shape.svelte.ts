// SPDX-License-Identifier: GPL-3.0-or-later
// The shape of the notes of the graph, for a trial: dots with the title
// below, or pills with the title inside. Kept on this device.
import type { GraphPoint } from './graph-data.ts';

export type NodeShape = 'dot' | 'pill';

const STORAGE_KEY = 'musubi.graph.nodeShape';

// Size of the pills, in units of the graph (one unit is a screen pixel at
// zoom 1).
export const PILL_FONT_SIZE = 9;
export const PILL_FONT = `${String(PILL_FONT_SIZE)}px system-ui, sans-serif`;
const PILL_PADDING = 6;
const PILL_HALF_HEIGHT = 8;
const HALF = 2;

function readShape(): NodeShape {
	return localStorage.getItem(STORAGE_KEY) === 'pill' ? 'pill' : 'dot';
}

class GraphShape {
	value = $state<NodeShape>(readShape());

	set(shape: NodeShape): void {
		this.value = shape;
		localStorage.setItem(STORAGE_KEY, shape);
	}
}

export const graphShape = new GraphShape();

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
