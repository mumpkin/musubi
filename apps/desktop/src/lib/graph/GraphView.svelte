<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- The graph of notes and links: zoom and pan with the wheel and the
     pointer, drag a note to move it, hover to read its title, click to
     select it, double click to open it. Drawn on a canvas so that
     thousands of notes stay fluid. -->
<script lang="ts">
	import type { Simulation } from 'd3-force';
	import { select } from 'd3-selection';
	import {
		zoom,
		type ZoomBehavior,
		zoomIdentity,
		type ZoomTransform,
	} from 'd3-zoom';
	import { onMount } from 'svelte';

	import type { Graph } from '../bindings/Graph.ts';
	import { themes } from '../theme/theme-state.svelte.ts';
	import {
		type GraphEdge,
		type GraphModel,
		type GraphPoint,
		keepPosition,
		pointUnder,
		readGraph,
		toModel,
	} from './graph-data.ts';
	import { dragging } from './graph-drag.ts';
	import { drawGraph, type GraphColors, themeColors } from './graph-draw.ts';
	import {
		EVERY_NOTE,
		filterGraph,
		type GraphFilter,
	} from './graph-filter.ts';
	import { frameOf } from './graph-frame.ts';
	import { graphPresence } from './graph-presence.svelte.ts';
	import { simulate } from './graph-simulation.ts';
	import GraphPanel from './GraphPanel.svelte';

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

	let wrapper = $state<HTMLElement>();
	let canvas = $state<HTMLCanvasElement>();
	let model: GraphModel = { points: [], edges: [] };
	// The whole graph of the vault, and the part of it shown.
	let graph = $state.raw<Graph>();
	let filter = $state<GraphFilter>(EVERY_NOTE);
	// The note selected with a click: the filters keep the notes around it.
	let selected = $state<string>();
	let simulation: Simulation<GraphPoint, GraphEdge> | undefined;
	let transform: ZoomTransform = zoomIdentity;
	let hovered: GraphPoint | undefined;
	let colors: GraphColors | undefined;
	let frame = 0;
	let zoomer: ZoomBehavior<HTMLCanvasElement, unknown> | undefined;
	// The first layout is framed to show every note; later ones keep the
	// view the user chose.
	let isFramed = false;
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
					selected,
					hovered,
					ratio: window.devicePixelRatio,
				});
			}
		});
	}

	// The note under a point of the canvas (CSS pixels).
	function pointAt(left: number, top: number): GraphPoint | undefined {
		const [across, down] = transform.invert([left, top]);
		return pointUnder(model.points, across, down);
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
		if (isFramed || !canvas || !wrapper || !zoomer) {
			return;
		}
		const { clientWidth, clientHeight } = wrapper;
		const view = frameOf(model.points, clientWidth, clientHeight);
		if (view) {
			isFramed = true;
			zoomer.transform(select(canvas), view);
		}
	}

	$effect(() => {
		// Read to load the graph again when the notes change.
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		notes;
		readGraph()
			.then((read) => {
				graph = read;
			})
			.catch(() => undefined);
	});

	const centrePath = $derived(selected ?? current);
	const titleOf = (path: string | undefined) => {
		const node = graph?.nodes.find((entry) => entry.path === path);
		return node && { path: node.path, title: node.title };
	};

	// The notes the filter keeps, laid out again when it changes.
	$effect(() => {
		if (graph) {
			show(toModel(filterGraph(graph, filter, centrePath)));
		}
	});

	function changeFilter(next: GraphFilter): void {
		filter = next;
		isFramed = false;
	}

	$effect(() => {
		// Read to draw again when the current note changes.
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		current;
		draw();
	});

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
		const drags = dragging(target, {
			transform: () => transform,
			simulation: () => simulation,
			pointAt,
		});
		// A double click opens a note: it does not zoom.
		select(target).call(drags).call(zoomer).on('dblclick.zoom', null);
		const centre = zoomIdentity.translate(
			box.clientWidth / HALF,
			box.clientHeight / HALF,
		);
		zoomer.transform(select(target), centre);
		const observer = new ResizeObserver(() => {
			resize(target, box);
		});
		observer.observe(box);
		const leave = graphPresence.enter();
		return () => {
			leave();
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

	// A click selects a note, or clears the selection on the background;
	// a double click, or `Enter`, opens it.
	function handleClick(event: MouseEvent): void {
		selected = pointAt(event.offsetX, event.offsetY)?.path;
		draw();
	}

	function handleDoubleClick(event: MouseEvent): void {
		const point = pointAt(event.offsetX, event.offsetY);
		if (point) {
			onOpen(point.path);
		}
	}

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter' && selected !== undefined) {
			onOpen(selected);
		}
	}
</script>

<div
	bind:this={wrapper}
	class="graph-view"
>
	<GraphPanel
		{filter}
		centre={titleOf(centrePath)}
		selected={titleOf(selected)}
		onFilter={changeFilter}
		{onOpen}
	/>
	<canvas
		bind:this={canvas}
		class="graph-canvas"
		tabindex="0"
		aria-label="Graph of the notes and their links"
		onpointermove={handlePointerMove}
		onclick={handleClick}
		ondblclick={handleDoubleClick}
		onkeydown={handleKeydown}
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
