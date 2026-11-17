// SPDX-License-Identifier: GPL-3.0-or-later
// Draws the graph on a canvas, in the colors of the theme. Only what is in
// view is drawn. A note under the pointer, or selected, stands out with its
// links and linked notes; the rest fades.
import type { ZoomTransform } from 'd3-zoom';

import { folderPalette } from '../vault/folder-palette.svelte.ts';
import type { GraphColors } from './graph-colors.ts';
import type { GraphEdge, GraphModel, GraphPoint } from './graph-data.ts';
import { drawTitles } from './graph-draw-titles.ts';
import { folderOf } from './graph-filter.ts';
import { type Halo, halosAround } from './graph-groups.ts';
import { PILL_FONT, PILL_FONT_SIZE } from './graph-options.svelte.ts';
import { type Area, isInside, viewArea } from './graph-view-area.ts';

export interface GraphScene {
	model: GraphModel;
	transform: ZoomTransform;
	colors: GraphColors;
	current: string;
	// Path of the note selected with a click.
	selected: string | undefined;
	// Notes grouped by folder below this folder: the nested circles of the
	// folders; `undefined` when not grouped.
	groupBase: string | undefined;
	hovered: GraphPoint | undefined;
	// The notes linked to each note, and the notes most linked first.
	neighbours: ReadonlyMap<GraphPoint, ReadonlySet<GraphPoint>>;
	byDegree: readonly GraphPoint[];
	// Canvas pixels per CSS pixel, and the size of the canvas in CSS pixels.
	ratio: number;
	size: { width: number; height: number };
}

// What a frame draws, worked out once.
export interface Frame {
	scene: GraphScene;
	area: Area;
	halos: Halo[];
	// The note that stands out, and the notes linked to it.
	focus: GraphPoint | undefined;
	near: ReadonlySet<GraphPoint>;
}

const FULL_CIRCLE = Math.PI + Math.PI;
const HALF = 2;
// Links in the muted color of the theme, see-through: they read on light
// and dark themes without hiding the notes. The more links in view, the
// fainter, down to a floor.
const LINK_OPACITY = 0.45;
const LINK_FLOOR = 0.1;
const LINKS_IN_VIEW = 400;
// Links of the note that stands out, and the fading of the others.
// Kept mild: the other links and notes stay readable around it.
const FOCUS_LINK_OPACITY = 0.7;
const FOCUS_LINK_WIDTH = 1.5;
const FADED_LINKS = 0.5;
const FADED = 0.4;
// Halos of the groups of notes.
const HALO_FILL_OPACITY = 0.08;
const HALO_STROKE_OPACITY = 0.35;
// Rings around the note of the pane, the selected one and the one under
// the pointer, in screen pixels: the fill keeps the color of the folder.
const CURRENT_RING = 2.5;
const HOVER_RING = 1.5;
const RING_GAP = 2;
// A dot is never smaller than this on screen, in pixels.
const MIN_DOT = 1.5;
// Titles inside pills: dark text reads on every color of the folders,
// which all have a mid lightness. Below this size on screen, in pixels,
// they are not written.
const PILL_TEXT = '#1b1f24';
const MIN_PILL_TEXT = 5;

function endpoint(end: GraphEdge['source']): GraphPoint | undefined {
	return typeof end === 'object' ? end : undefined;
}

function drawHalos(context: CanvasRenderingContext2D, frame: Frame) {
	context.lineWidth = 1 / frame.scene.transform.k;
	for (const halo of frame.halos) {
		const color = folderPalette.colorOf(halo.folder)
			?? frame.scene.colors.node;
		context.fillStyle = color;
		context.strokeStyle = color;
		context.beginPath();
		context.arc(halo.across, halo.down, halo.radius, 0, FULL_CIRCLE);
		context.globalAlpha = HALO_FILL_OPACITY;
		context.fill();
		context.globalAlpha = HALO_STROKE_OPACITY;
		context.stroke();
	}
	context.globalAlpha = 1;
}

const acrossOf = (point: GraphPoint): number => point.x ?? 0;
const downOf = (point: GraphPoint): number => point.y ?? 0;

// Whether the link from `source` to `target` may cross the view: both
// ends are not on the same outer side of it.
function crossesView(area: Area, source: GraphPoint, target: GraphPoint) {
	const across = [acrossOf(source), acrossOf(target)];
	const down = [downOf(source), downOf(target)];
	return Math.max(...across) >= area.left
		&& Math.min(...across) <= area.right
		&& Math.max(...down) >= area.top
		&& Math.min(...down) <= area.bottom;
}

function linksInView(frame: Frame): [GraphPoint, GraphPoint][] {
	return frame.scene.model.edges.flatMap((edge) => {
		const source = endpoint(edge.source);
		const target = endpoint(edge.target);
		return source && target && crossesView(frame.area, source, target)
			? [[source, target] as [GraphPoint, GraphPoint]]
			: [];
	});
}

function strokeLinks(
	context: CanvasRenderingContext2D,
	links: [GraphPoint, GraphPoint][],
) {
	context.beginPath();
	for (const [source, target] of links) {
		context.moveTo(source.x ?? 0, source.y ?? 0);
		context.lineTo(target.x ?? 0, target.y ?? 0);
	}
	context.stroke();
}

function drawEdges(context: CanvasRenderingContext2D, frame: Frame) {
	const { scene, focus } = frame;
	const links = linksInView(frame);
	const crowd = Math.sqrt(LINKS_IN_VIEW / Math.max(links.length, 1));
	const opacity = Math.max(LINK_FLOOR, Math.min(1, crowd) * LINK_OPACITY);
	context.globalAlpha = focus ? opacity * FADED_LINKS : opacity;
	context.strokeStyle = scene.colors.link;
	context.lineWidth = 1 / scene.transform.k;
	strokeLinks(context, links);
	if (focus) {
		context.globalAlpha = FOCUS_LINK_OPACITY;
		context.strokeStyle = scene.colors.current;
		context.lineWidth = FOCUS_LINK_WIDTH / scene.transform.k;
		strokeLinks(
			context,
			links.filter(([source, target]) =>
				source === focus || target === focus),
		);
	}
	context.globalAlpha = 1;
}

function fillOf(point: GraphPoint, scene: GraphScene): string {
	return folderPalette.colorOf(folderOf(point.path)) ?? scene.colors.node;
}

function ringOf(
	point: GraphPoint,
	scene: GraphScene,
): { color: string; width: number } | undefined {
	if (point.path === scene.current) {
		return { color: scene.colors.current, width: CURRENT_RING };
	}
	if (point.path === scene.selected) {
		return { color: scene.colors.hovered, width: CURRENT_RING };
	}
	if (point === scene.hovered) {
		return { color: scene.colors.hovered, width: HOVER_RING };
	}
	return undefined;
}

// The outline of `point`, grown by `grow` graph units: its disc, never
// smaller than `MIN_DOT` on screen, or its pill.
function traceNode(
	context: CanvasRenderingContext2D,
	point: GraphPoint,
	{ grow, scale }: { grow: number; scale: number },
) {
	const across = point.x ?? 0;
	const down = point.y ?? 0;
	context.beginPath();
	if (point.halfWidth === undefined || point.halfHeight === undefined) {
		const radius = Math.max(point.radius, MIN_DOT / scale);
		context.arc(across, down, radius + grow, 0, FULL_CIRCLE);
		return;
	}
	const halfWidth = point.halfWidth + grow;
	const halfHeight = point.halfHeight + grow;
	context.roundRect(
		across - halfWidth,
		down - halfHeight,
		halfWidth * HALF,
		halfHeight * HALF,
		halfHeight,
	);
}

// The title written inside a pill, when it is large enough to read.
function drawPillTitle(
	context: CanvasRenderingContext2D,
	point: GraphPoint,
	scale: number,
) {
	if (PILL_FONT_SIZE * scale < MIN_PILL_TEXT) {
		return;
	}
	context.fillStyle = PILL_TEXT;
	context.font = PILL_FONT;
	context.textAlign = 'center';
	context.textBaseline = 'middle';
	context.fillText(point.title, point.x ?? 0, point.y ?? 0);
}

function drawRing(
	context: CanvasRenderingContext2D,
	point: GraphPoint,
	scene: GraphScene,
) {
	const ring = ringOf(point, scene);
	if (ring) {
		const scale = scene.transform.k;
		context.strokeStyle = ring.color;
		context.lineWidth = ring.width / scale;
		const grow = (RING_GAP + ring.width / HALF) / scale;
		traceNode(context, point, { grow, scale });
		context.stroke();
	}
}

function drawNode(
	context: CanvasRenderingContext2D,
	point: GraphPoint,
	frame: Frame,
) {
	const { scene, focus, near } = frame;
	const scale = scene.transform.k;
	const isFaded = focus !== undefined && point !== focus && !near.has(point);
	context.globalAlpha = isFaded ? FADED : 1;
	context.fillStyle = fillOf(point, scene);
	traceNode(context, point, { grow: 0, scale });
	context.fill();
	if (point.halfWidth !== undefined) {
		drawPillTitle(context, point, scale);
	}
	drawRing(context, point, scene);
	context.globalAlpha = 1;
}

function frameOfScene(scene: GraphScene): Frame {
	const focus = scene.hovered
		?? scene.model.points.find((point) => point.path === scene.selected);
	return {
		scene,
		area: viewArea(scene.transform, scene.size),
		halos: scene.groupBase === undefined
			? []
			: halosAround(scene.model.points, scene.groupBase),
		focus,
		near: (focus && scene.neighbours.get(focus)) ?? new Set(),
	};
}

export function drawGraph(canvas: HTMLCanvasElement, scene: GraphScene) {
	const context = canvas.getContext('2d');
	if (!context) {
		return;
	}
	const { transform, ratio } = scene;
	context.setTransform(1, 0, 0, 1, 0, 0);
	context.fillStyle = scene.colors.background;
	context.fillRect(0, 0, canvas.width, canvas.height);
	context.setTransform(
		ratio * transform.k,
		0,
		0,
		ratio * transform.k,
		ratio * transform.x,
		ratio * transform.y,
	);
	const frame = frameOfScene(scene);
	drawHalos(context, frame);
	drawEdges(context, frame);
	for (const point of scene.model.points) {
		if (isInside(frame.area, point)) {
			drawNode(context, point, frame);
		}
	}
	context.setTransform(ratio, 0, 0, ratio, 0, 0);
	drawTitles(context, frame);
}
