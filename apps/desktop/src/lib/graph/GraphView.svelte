<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- The graph of notes and links: zoom and pan with the wheel and the
     pointer, drag a note to move it, hover to read its title, click to
     select it, double click to open it. Drawn on a canvas so that
     thousands of notes stay fluid. -->
<script lang="ts">
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
	import { type GraphColors, themeColors } from './graph-colors.ts';
	import { type GraphPoint, readGraph, toModel } from './graph-data.ts';
	import { dragging } from './graph-drag.ts';
	import { drawGraph } from './graph-draw.ts';
	import { Fades } from './graph-fades.ts';
	import {
		EVERY_NOTE,
		filterGraph,
		type GraphFilter,
		groupBaseOf,
	} from './graph-filter.ts';
	import { frameOf } from './graph-frame.ts';
	import { groupMembers } from './graph-groups.ts';
	import { GraphLayout } from './graph-layout.ts';
	import { graphOptions, shapePoints } from './graph-options.svelte.ts';
	import { graphPresence } from './graph-presence.svelte.ts';
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
	// The whole graph of the vault, and the part of it shown.
	let graph = $state.raw<Graph>();
	let filter = $state<GraphFilter>(EVERY_NOTE);
	// The note selected with a click: the filters keep the notes around it.
	let selected = $state<string>();
	let transform: ZoomTransform = zoomIdentity;
	let hovered: GraphPoint | undefined;
	const fades = new Fades();
	let colors: GraphColors | undefined;
	let frame = 0;
	let zoomer: ZoomBehavior<HTMLCanvasElement, unknown> | undefined;
	// The first layout is framed to show every note; later ones keep the
	// view the user chose.
	let isFramed = false;
	// Grouping the notes, or not, frames them again.
	let wasGrouped: string | undefined;
	// How settled the layout is when it is framed (`alpha` of d3-force,
	// from 1 down to 0).
	const SETTLED = 0.1;

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
				const isFading = drawGraph(canvas, {
					model: layout.model,
					transform,
					colors,
					current,
					selected,
					groupBase,
					hovered,
					neighbours: layout.neighbours,
					byDegree: layout.byDegree,
					fades,
					ratio: window.devicePixelRatio,
					size: {
						width: canvas.clientWidth,
						height: canvas.clientHeight,
					},
				});
				if (isFading) {
					draw();
				}
			}
		});
	}

	// The note under a point of the canvas (CSS pixels).
	const pointAt = (left: number, top: number): GraphPoint | undefined =>
		layout.pointAt(transform, [left, top]);

	const layout = new GraphLayout(() => {
		if ((layout.simulation?.alpha() ?? 0) < SETTLED) {
			frameNotes();
		}
		draw();
	});

	// Zooms so that every note is in view, once.
	function frameNotes(): void {
		if (isFramed || !canvas || !wrapper || !zoomer) {
			return;
		}
		const { clientWidth: width, clientHeight: height } = wrapper;
		const view = frameOf(
			layout.model.points,
			{ width, height },
			groupBase,
		);
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
	const groupBase = $derived(
		groupBaseOf(filter, centrePath, graphOptions.isGrouped),
	);
	const titleOf = (path: string | undefined) => {
		const node = graph?.nodes.find((entry) => entry.path === path);
		return node && { path: node.path, title: node.title };
	};

	// The notes the filter keeps, laid out again when they, their shape or
	// their grouping change; selecting a note in the whole graph moves
	// nothing.
	$effect(() => {
		if (graph) {
			const model = toModel(filterGraph(graph, filter, centrePath));
			const shape = graphOptions.shape;
			shapePoints(model.points, shape);
			if (groupBase !== wasGrouped) {
				wasGrouped = groupBase;
				isFramed = false;
			}
			if (!layout.show({ model, groupBase, shape })) {
				draw();
			}
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
			simulation: () => layout.simulation,
			pointAt,
			groupOf: (point) =>
				groupMembers(layout.model.points, point, groupBase),
			freeAround: (point) => layout.freeAround(point, groupBase),
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
			layout.stop();
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
