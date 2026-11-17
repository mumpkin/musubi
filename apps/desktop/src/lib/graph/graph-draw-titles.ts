// SPDX-License-Identifier: GPL-3.0-or-later
// The titles of the graph, written in screen pixels so that they keep
// their size at every zoom, and only where they cover no other title:
// first the notes marked (of the pane, selected, under the pointer) and
// the notes linked to the one that stands out, then the names of the
// folders, then the most linked notes, as long as their dot is large
// enough to tell apart. Pills hold their own title. While a note stands
// out, the titles of the others fade; titles fade in and out as they come
// and go (`graph-fades.ts`).
import { folderPalette } from '../vault/folder-palette.svelte.ts';
import type { GraphPoint } from './graph-data.ts';
import type { Frame } from './graph-draw.ts';
import type { Halo } from './graph-groups.ts';
import { boxAt, type LabelBox, LabelSpace, TextWidths } from './graph-labels.ts';

const TITLE_SIZE = 12;
const TITLE_FONT = `${String(TITLE_SIZE)}px system-ui, sans-serif`;
const FOLDER_SIZE = 13;
const FOLDER_FONT = `600 ${String(FOLDER_SIZE)}px system-ui, sans-serif`;
// Room between a dot and its title, and around each title, in pixels.
const TITLE_GAP = 4;
const TITLE_MARGIN = 2;
// An outline in the background color keeps titles readable over links.
const OUTLINE = 3;
// At most this many titles, for speed; only dots at least this large on
// screen, and circles of folders at least this wide, get one.
const MAX_TITLES = 250;
const MIN_TITLED_DOT = 3;
const MIN_NAMED_HALO = 24;
// Same as the smallest dot drawn, see `graph-draw.ts`.
const MIN_DOT = 1.5;
// Titles of the other notes while one stands out.
const FADED_TITLE = 0.3;

let widths: { titles: TextWidths; folders: TextWidths } | undefined;

interface Writing {
	context: CanvasRenderingContext2D;
	frame: Frame;
	space: LabelSpace;
	written: Set<GraphPoint>;
}

function write(
	writing: Writing,
	text: string,
	at: { across: number; top: number },
) {
	const { context } = writing;
	context.strokeText(text, at.across, at.top);
	context.fillText(text, at.across, at.top);
}

// How strongly the title of `point` shows: fully for the note that stands
// out and its linked notes, faded for the others meanwhile.
function strengthOf(writing: Writing, point: GraphPoint): number {
	const { frame } = writing;
	const isNear = point === frame.focus || frame.near.has(point)
		|| point.path === frame.scene.current;
	const target = frame.focus === undefined || isNear ? 1 : FADED_TITLE;
	return frame.scene.fades.title(point, target);
}

function isOnScreen(frame: Frame, box: LabelBox): boolean {
	const { width, height } = frame.scene.size;
	return box.right > 0 && box.left < width && box.bottom > 0
		&& box.top < height;
}

// Lines tried below a forced title that would cover another.
const FORCED_TRIES = 3;

// The box of a title of `point`, `line` lines below its usual place.
function noteBox(writing: Writing, point: GraphPoint, line: number) {
	const { transform } = writing.frame.scene;
	const across = transform.applyX(point.x ?? 0);
	const radius = Math.max(point.radius * transform.k, MIN_DOT);
	const top = transform.applyY(point.y ?? 0) + radius + TITLE_GAP
		+ line * (TITLE_SIZE + TITLE_GAP);
	const box = boxAt(across, top, {
		width: widths?.titles.of(point.title) ?? 0,
		height: TITLE_SIZE,
		margin: TITLE_MARGIN,
	});
	return { across, top, box };
}

// Writes the title of `point` under its dot if it fits. A `forced` title
// is always written, lower down if its place is taken.
function writeNote(writing: Writing, point: GraphPoint, isForced: boolean) {
	const tries = isForced ? FORCED_TRIES : 1;
	for (let line = 0; line < tries; line += 1) {
		const at = noteBox(writing, point, line);
		if (!isOnScreen(writing.frame, at.box)) {
			return;
		}
		const isLast = line === tries - 1;
		if (writing.space.take(at.box) || (isForced && isLast)) {
			writing.context.globalAlpha = strengthOf(writing, point);
			write(writing, point.title, at);
			writing.context.globalAlpha = 1;
			writing.written.add(point);
			return;
		}
	}
}

function writeFolder(writing: Writing, halo: Halo) {
	const { context, frame } = writing;
	const { transform } = frame.scene;
	if (halo.radius * transform.k < MIN_NAMED_HALO) {
		return;
	}
	const name = halo.folder.slice(halo.folder.lastIndexOf('/') + 1);
	const across = transform.applyX(halo.across);
	const top = transform.applyY(halo.down - halo.radius) - TITLE_GAP
		- FOLDER_SIZE;
	const box = boxAt(across, top, {
		width: widths?.folders.of(name) ?? 0,
		height: FOLDER_SIZE,
		margin: TITLE_MARGIN,
	});
	if (isOnScreen(frame, box) && writing.space.take(box)) {
		context.fillStyle = folderPalette.colorOf(halo.folder)
			?? frame.scene.colors.node;
		write(writing, name, { across, top });
	}
}

// The notes marked in the scene: under the pointer, selected, of the pane.
function markedNotes(frame: Frame): GraphPoint[] {
	const { scene } = frame;
	return scene.model.points.filter((point) =>
		point === scene.hovered
		|| point.path === scene.selected
		|| point.path === scene.current);
}

// Writes the titles of `points` that fit; with `isAnySize`, small dots
// too.
function writeNotes(
	writing: Writing,
	points: Iterable<GraphPoint>,
	isAnySize: boolean,
) {
	const scale = writing.frame.scene.transform.k;
	for (const point of points) {
		if (writing.written.size >= MAX_TITLES) {
			return;
		}
		const isDot = point.halfWidth === undefined;
		const isLarge = isAnySize || point.radius * scale >= MIN_TITLED_DOT;
		if (isDot && isLarge && !writing.written.has(point)) {
			writeNote(writing, point, false);
		}
	}
}

function prepare(context: CanvasRenderingContext2D, frame: Frame) {
	widths ??= {
		titles: new TextWidths(TITLE_FONT),
		folders: new TextWidths(FOLDER_FONT),
	};
	context.textAlign = 'center';
	context.textBaseline = 'top';
	context.lineJoin = 'round';
	context.lineWidth = OUTLINE;
	context.strokeStyle = frame.scene.colors.background;
}

export function drawTitles(context: CanvasRenderingContext2D, frame: Frame) {
	prepare(context, frame);
	const writing: Writing = {
		context,
		frame,
		space: new LabelSpace(),
		written: new Set(),
	};
	context.font = TITLE_FONT;
	context.fillStyle = frame.scene.colors.label;
	for (const point of markedNotes(frame)) {
		if (point.halfWidth === undefined) {
			writeNote(writing, point, true);
		}
	}
	writeNotes(writing, frame.near, true);
	context.font = FOLDER_FONT;
	for (const halo of frame.halos) {
		writeFolder(writing, halo);
	}
	context.font = TITLE_FONT;
	context.fillStyle = frame.scene.colors.label;
	writeNotes(writing, frame.scene.byDegree, false);
	writeLeaving(writing);
}

// The titles no longer written, fading out where they were.
function writeLeaving(writing: Writing) {
	for (const [point, strength] of writing.frame.scene.fades.leaving()) {
		writing.context.globalAlpha = strength;
		write(writing, point.title, noteBox(writing, point, 0));
	}
	writing.context.globalAlpha = 1;
}
