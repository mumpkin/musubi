<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- The graph of notes and links: zoom and pan with the wheel and the
     pointer, drag a note to move it, hover to read its title, click to
     open it. Drawn on a canvas so that thousands of notes stay fluid. -->
<script lang="ts">
	import { type D3DragEvent, drag } from 'd3-drag';
	import type { Simulation } from 'd3-force';
	import { select } from 'd3-selection';
	import {
		zoom,
		type ZoomBehavior,
		zoomIdentity,
		type ZoomTransform,
	} from 'd3-zoom';
	import { onMount } from 'svelte';

	import { themes } from '../theme/theme-state.svelte.ts';
	import {
		boundsOf,
		type GraphEdge,
		type GraphModel,
		type GraphPoint,
		keepPosition,
		vaultGraph,
	} from './graph-data.ts';
	import { drawGraph, type GraphColors, themeColors } from './graph-draw.ts';
	import { simulate } from './graph-simulation.ts';

	interface Props {
		// Path of the note to highlight.
		current: string;
		// Notes of the vault: the graph is read again when they change.
		notes: ReadonlySet<string>;
		onOpen: (path: string) => void;
		// The pane has the focus: the graph takes the keyboard once shown.
		autofocus?: boolean;
	}

	const { current, notes, onOpen, autofocus = false }: Props = $props();

	$effect(() => {
		if (canvas && autofocus) {
			canvas.focus({ preventScroll: true });
		}
	});

	const MIN_ZOOM = 0.05;
	const MAX_ZOOM = 8;
	const HALF = 2;
	// How far from a note, in screen pixels, the pointer still reaches it.
	const POINTER_REACH = 10;
	const REHEAT = 0.3;

	let wrapper = $state<HTMLElement>();
	let canvas = $state<HTMLCanvasElement>();
	let model: GraphModel = { points: [], edges: [] };
	let simulation: Simulation<GraphPoint, GraphEdge> | undefined;
	let transform: ZoomTransform = zoomIdentity;
	let hovered: GraphPoint | undefined;
	let colors: GraphColors | undefined;
	let frame = 0;
	let zoomer: ZoomBehavior<HTMLCanvasElement, unknown> | undefined;
	// The first layout is framed to show every note; later ones keep the
	// view the user chose.
	let isFramed = false;
	// Room around the notes when framing, in screen pixels.
	const FRAME_MARGIN = 60;
	const MAX_FRAME_ZOOM = 2;
	// How settled the layout is when it is framed (`alpha` of d3-force,
	// from 1 down to 0).
	const SETTLED = 0.3;

	// A new theme: the canvas reads its colors again.
	$effect(() => {
		if (themes.revision > 0 && wrapper) {
			colors = themeColors(wrapper);
			draw();
		}
	});

	function draw(): void {
		if (frame !== 0) {
			return;
		}
		frame = requestAnimationFrame(() => {
			frame = 0;
			if (canvas && colors) {
				drawGraph(canvas, {
					model,
					transform,
					colors,
					current,
					hovered,
					ratio: window.devicePixelRatio,
				});
			}
		});
	}

	// The note under a point of the canvas (CSS pixels).
	function pointAt(left: number, top: number): GraphPoint | undefined {
		const [across, down] = transform.invert([left, top]);
		return simulation?.find(across, down, POINTER_REACH / transform.k);
	}

	// Positions of the notes already shown are kept when the graph is read
	// again.
	function show(next: GraphModel): void {
		const known = new Map(model.points.map((point) => [point.path, point]));
		for (const point of next.points) {
			const old = known.get(point.path);
			if (old) {
				keepPosition(point, old);
			}
		}
		model = next;
		simulation?.stop();
		simulation = simulate(model).on('tick', () => {
			if ((simulation?.alpha() ?? 0) < SETTLED) {
				frameNotes();
			}
			draw();
		});
	}

	// Zooms so that every note is in view, once.
	function frameNotes(): void {
		const bounds = boundsOf(model.points);
		if (isFramed || !bounds || !canvas || !wrapper || !zoomer) {
			return;
		}
		isFramed = true;
		const { clientWidth, clientHeight } = wrapper;
		const scale = Math.min(
			MAX_FRAME_ZOOM,
			(clientWidth - FRAME_MARGIN) / Math.max(bounds.width, 1),
			(clientHeight - FRAME_MARGIN) / Math.max(bounds.height, 1),
		);
		const centre = zoomIdentity
			.translate(clientWidth / HALF, clientHeight / HALF)
			.scale(scale)
			.translate(
				-(bounds.left + bounds.width / HALF),
				-(bounds.top + bounds.height / HALF),
			);
		zoomer.transform(select(canvas), centre);
	}

	$effect(() => {
		// Read to load the graph again when the notes change.
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		notes;
		vaultGraph().then(show).catch(() => undefined);
	});

	$effect(() => {
		// Read to draw again when the current note changes.
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		current;
		draw();
	});

	// `x` and `y` are where d3-drag reads the start of a drag.

	interface DragSubject {
		point: GraphPoint;
		x: number;
		y: number;
	}

	type DragEvent = D3DragEvent<HTMLCanvasElement, unknown, DragSubject>;

	function moveTo(event: DragEvent): void {
		const [across, down] = transform.invert([event.x, event.y]);
		event.subject.point.fx = across;
		event.subject.point.fy = down;
	}

	// A note follows the pointer while dragged; elsewhere the pointer pans.
	function dragging(target: HTMLCanvasElement) {
		return drag<HTMLCanvasElement, unknown, DragSubject | undefined>()
			.container(target)
			.subject((event: DragSubject) => {
				const point = pointAt(event.x, event.y);
				return point && { ...event, point };
			})
			.on('start', (event: DragEvent) => {
				simulation?.alphaTarget(REHEAT).restart();
				moveTo(event);
			})
			.on('drag', moveTo)
			.on('end', (event: DragEvent) => {
				simulation?.alphaTarget(0);
				event.subject.point.fx = null;
				event.subject.point.fy = null;
			});
	}

	function zooming(): ZoomBehavior<HTMLCanvasElement, unknown> {
		return zoom<HTMLCanvasElement, unknown>()
			.scaleExtent([MIN_ZOOM, MAX_ZOOM])
			.on('zoom', (event: { transform: ZoomTransform }) => {
				transform = event.transform;
				draw();
			});
	}

	function resize(target: HTMLCanvasElement, box: HTMLElement): void {
		const ratio = window.devicePixelRatio;
		target.width = Math.round(box.clientWidth * ratio);
		target.height = Math.round(box.clientHeight * ratio);
		draw();
	}

	onMount(() => {
		if (!canvas || !wrapper) {
			return undefined;
		}
		const target = canvas;
		const box = wrapper;
		colors = themeColors(box);
		zoomer = zooming();
		select(target).call(dragging(target)).call(zoomer);
		const centre = zoomIdentity.translate(
			box.clientWidth / HALF,
			box.clientHeight / HALF,
		);
		zoomer.transform(select(target), centre);
		const observer = new ResizeObserver(() => {
			resize(target, box);
		});
		observer.observe(box);
		return () => {
			observer.disconnect();
			simulation?.stop();
			cancelAnimationFrame(frame);
		};
	});

	function handlePointerMove(event: PointerEvent): void {
		const point = pointAt(event.offsetX, event.offsetY);
		if (point !== hovered) {
			hovered = point;
			if (canvas) {
				canvas.style.cursor = point ? 'pointer' : 'grab';
			}
			draw();
		}
	}

	function handleClick(event: MouseEvent): void {
		const point = pointAt(event.offsetX, event.offsetY);
		if (point) {
			onOpen(point.path);
		}
	}
</script>

<div
	bind:this={wrapper}
	class="graph-view"
>
	<canvas
		bind:this={canvas}
		class="graph-canvas"
		tabindex="0"
		aria-label="Graph of the notes and their links"
		onpointermove={handlePointerMove}
		onclick={handleClick}
	></canvas>
</div>

<style>
	.graph-view {
		position: relative;
		height: 100%;
		min-height: 0;
		overflow: hidden;
	}

	canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		outline: none;
		cursor: grab;
	}
</style>
