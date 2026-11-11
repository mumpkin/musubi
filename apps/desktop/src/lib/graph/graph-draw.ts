// SPDX-License-Identifier: GPL-3.0-or-later
// Draws the graph on a canvas, in the colors of the theme.
import type { ZoomTransform } from 'd3-zoom';

import type { GraphEdge, GraphModel, GraphPoint } from './graph-data.ts';

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

function colorOf(point: GraphPoint, scene: GraphScene): string {
	if (point.path === scene.current) {
		return scene.colors.current;
	}
	return point === scene.hovered ? scene.colors.hovered : scene.colors.node;
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
		context.fillStyle = colorOf(point, scene);
		context.beginPath();
		context.arc(point.x ?? 0, point.y ?? 0, point.radius, 0, FULL_CIRCLE);
		context.fill();
	}
	const isZoomedIn = transform.k >= LABEL_ZOOM;
	for (const point of scene.model.points) {
		const isMarked = point === scene.hovered
			|| point.path === scene.current;
		if (isZoomedIn || isMarked) {
			drawLabel(context, point, scene);
		}
	}
}
