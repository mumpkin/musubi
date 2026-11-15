// SPDX-License-Identifier: GPL-3.0-or-later
// The force that groups the notes of the graph by folder, as the folders
// nest. Every step, each note is pulled to the middle of the notes of its
// folder, and of the folders above it, more weakly; folders side by side
// whose circles overlap, or a folder and the notes right in the folder
// above it, are pushed apart as wholes. The groups move with
// the notes: dragging one drags its folder along.
import type { Force } from 'd3-force';

import type { GraphEdge, GraphPoint } from './graph-data.ts';
import { folderOf } from './graph-filter.ts';
import { type Centre, circleAround, halosAround } from './graph-groups.ts';

// Pull to the middle of the folder of a note, then to the folders above,
// each weaker by `ANCESTOR_FALLOFF`.
const COHESION = 0.25;
const ANCESTOR_FALLOFF = 0.4;
// Push between folders side by side, and the room kept between them.
const SEPARATION = 1;
const SIBLING_GAP = 12;

// The folder of `path` and every folder above it, nearest first, below
// `base`.
function foldersAbove(path: string, base: string): string[] {
	const folders: string[] = [];
	let folder = folderOf(path);
	while (folder !== '' && folder !== base) {
		folders.push(folder);
		folder = folderOf(folder);
	}
	return folders;
}

// The middle of the notes of each folder, its subfolders included.
function middles(points: GraphPoint[], base: string): Map<string, Centre> {
	const sums = new Map<string, Centre & { count: number }>();
	for (const point of points) {
		for (const folder of foldersAbove(point.path, base)) {
			const sum = sums.get(folder) ?? { across: 0, down: 0, count: 0 };
			sum.across += point.x ?? 0;
			sum.down += point.y ?? 0;
			sum.count += 1;
			sums.set(folder, sum);
		}
	}
	const centres = new Map<string, Centre>();
	for (const [folder, sum] of sums) {
		centres.set(folder, {
			across: sum.across / sum.count,
			down: sum.down / sum.count,
		});
	}
	return centres;
}

function pullTogether(
	points: GraphPoint[],
	base: string,
	alpha: number,
): void {
	const centres = middles(points, base);
	for (const point of points) {
		let strength = COHESION * alpha;
		for (const folder of foldersAbove(point.path, base)) {
			const centre = centres.get(folder);
			if (centre) {
				const across = centre.across - (point.x ?? 0);
				const down = centre.down - (point.y ?? 0);
				point.vx = (point.vx ?? 0) + across * strength;
				point.vy = (point.vy ?? 0) + down * strength;
			}
			strength *= ANCESTOR_FALLOFF;
		}
	}
}

// What the separation moves: the notes right in a folder, or a subfolder
// with everything in it, and the circle around them.
interface Block extends Centre {
	radius: number;
	holds: (point: GraphPoint) => boolean;
}

// Moves every note of `block` by `push`.
function nudge(points: GraphPoint[], block: Block, push: Centre): void {
	for (const point of points.filter(block.holds)) {
		point.vx = (point.vx ?? 0) + push.across;
		point.vy = (point.vy ?? 0) + push.down;
	}
}

// Pushes apart two blocks side by side whose circles overlap.
function separate(
	points: GraphPoint[],
	pair: [Block, Block],
	alpha: number,
): void {
	const [one, other] = pair;
	const across = other.across - one.across;
	const down = other.down - one.down;
	const distance = Math.hypot(across, down) || 1;
	const overlap = one.radius + other.radius + SIBLING_GAP - distance;
	if (overlap <= 0) {
		return;
	}
	const step = (overlap * SEPARATION * alpha) / distance;
	nudge(points, other, { across: across * step, down: down * step });
	nudge(points, one, { across: -across * step, down: -down * step });
}

// The blocks inside each folder: the cluster of its own notes, and its
// subfolders.
function blocksOf(points: GraphPoint[], base: string): Map<string, Block[]> {
	const blocks = new Map<string, Block[]>();
	const add = (parent: string, block: Block) => {
		blocks.set(parent, [...(blocks.get(parent) ?? []), block]);
	};
	for (const halo of halosAround(points, base)) {
		add(folderOf(halo.folder), {
			...halo,
			holds: (point) => point.path.startsWith(`${halo.folder}/`),
		});
	}
	for (const folder of new Set(points.map((point) => folderOf(point.path)))) {
		const holds = (point: GraphPoint) => folderOf(point.path) === folder;
		add(folder, { ...circleAround(points.filter(holds)), holds });
	}
	return blocks;
}

function pushApart(
	points: GraphPoint[],
	base: string,
	alpha: number,
): void {
	for (const blocks of blocksOf(points, base).values()) {
		for (const [index, one] of blocks.entries()) {
			for (const other of blocks.slice(index + 1)) {
				separate(points, [one, other], alpha);
			}
		}
	}
}

// Groups the notes by folder below `base` (`''`: the vault root).
export function folderGroups(base: string): Force<GraphPoint, GraphEdge> {
	let points: GraphPoint[] = [];
	const force = (alpha: number): void => {
		pullTogether(points, base, alpha);
		pushApart(points, base, alpha);
	};
	force.initialize = (nodes: GraphPoint[]): void => {
		points = nodes;
	};
	return force;
}
