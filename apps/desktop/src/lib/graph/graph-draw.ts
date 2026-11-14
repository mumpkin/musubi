// SPDX-License-Identifier: GPL-3.0-or-later
// Draws the graph on a canvas, in the colors of the theme.
import type { ZoomTransform } from 'd3-zoom';

import { folderPalette } from '../vault/folder-palette.svelte.ts';
import type { GraphEdge, GraphModel, GraphPoint } from './graph-data.ts';
import { folderOf } from './graph-filter.ts';

export interface GraphColors {
	link: string;
	node: string;
	current: string;
	hovered: string;
	label: string;
	background: string;
}

// The colors of CSS variables, resolved: the canvas cannot read
// `var(--accent)` nor `light-dark(…)`.
export function themeColors(element: Element): GraphColors {
	const probe = document.createElement('span');
	element.append(probe);
	const resolve = (variable: string): string => {
		probe.style.color = `var(${variable})`;
		return getComputedStyle(probe).color;
	};
	const colors = {
		link: resolve('--border'),
		node: resolve('--muted'),
		current: resolve('--accent'),
		hovered: resolve('--foreground'),
		label: resolve('--foreground'),
		background: resolve('--background'),
	};
	probe.remove();
	return colors;
}

export interface GraphScene {
	model: GraphModel;
	transform: ZoomTransform;
	colors: GraphColors;
	current: string;
	// Path of the note selected with a click.
	selected: string | undefined;
	hovered: GraphPoint | undefined;
	// Canvas pixels per CSS pixel.
	ratio: number;
}

// Labels of every node show from this zoom level on.
const LABEL_ZOOM = 1.4;
const LABEL_SIZE = 12;
const LABEL_GAP = 4;
const FULL_CIRCLE = Math.PI + Math.PI;

function endpoint(end: GraphEdge['source']): GraphPoint | undefined {
	return typeof end === 'object' ? end : undefined;
}

function drawEdges(context: CanvasRenderingContext2D, scene: GraphScene) {
	context.strokeStyle = scene.colors.link;
	context.lineWidth = 1 / scene.transform.k;
	context.beginPath();
	for (const edge of scene.model.edges) {
		const source = endpoint(edge.source);
		const target = endpoint(edge.target);
		if (source && target) {
			context.moveTo(source.x ?? 0, source.y ?? 0);
			context.lineTo(target.x ?? 0, target.y ?? 0);
		}
	}
	context.stroke();
}

// Rings around the note of the pane, the selected one and the one under
// the pointer, in screen pixels: the fill keeps the color of the folder.
const CURRENT_RING = 2.5;
const HOVER_RING = 1.5;
const RING_GAP = 2;
const HALF = 2;

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

function drawNode(
	context: CanvasRenderingContext2D,
	point: GraphPoint,
	scene: GraphScene,
) {
	const across = point.x ?? 0;
	const down = point.y ?? 0;
	context.fillStyle = fillOf(point, scene);
	context.beginPath();
	context.arc(across, down, point.radius, 0, FULL_CIRCLE);
	context.fill();
	const ring = ringOf(point, scene);
	if (ring) {
		const scale = scene.transform.k;
		context.strokeStyle = ring.color;
		context.lineWidth = ring.width / scale;
		context.beginPath();
		context.arc(
			across,
			down,
			point.radius + (RING_GAP + ring.width / HALF) / scale,
			0,
			FULL_CIRCLE,
		);
		context.stroke();
	}
}

function drawLabel(
	context: CanvasRenderingContext2D,
	point: GraphPoint,
	scene: GraphScene,
) {
	const scale = scene.transform.k;
	context.fillStyle = scene.colors.label;
	context.font = `${String(LABEL_SIZE / scale)}px system-ui, sans-serif`;
	context.textAlign = 'center';
	context.textBaseline = 'top';
	const top = (point.y ?? 0) + point.radius + LABEL_GAP / scale;
	context.fillText(point.title, point.x ?? 0, top);
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
	drawEdges(context, scene);
	for (const point of scene.model.points) {
		drawNode(context, point, scene);
	}
	const isZoomedIn = transform.k >= LABEL_ZOOM;
	for (const point of scene.model.points) {
		const isMarked = point === scene.hovered
			|| point.path === scene.current
			|| point.path === scene.selected;
		if (isZoomedIn || isMarked) {
			drawLabel(context, point, scene);
		}
	}
}
