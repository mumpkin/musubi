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
import {
	type Centre,
	circleAround,
	halosAround,
	pushTo,
} from './graph-groups.ts';

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

// Who is in which folder, worked out once for the notes laid out.
interface Folders {
	points: GraphPoint[];
	// Notes are grouped below this folder.
	base: string;
	// For each note, its folder and the folders above it, nearest first.
	chains: Map<GraphPoint, string[]>;
	// The notes of each folder, its subfolders included.
	deep: Map<string, GraphPoint[]>;
	// The notes right in each folder.
	own: Map<string, GraphPoint[]>;
}

function foldersOf(points: GraphPoint[], base: string): Folders {
	const folders: Folders = {
		points,
		base,
		chains: new Map(),
		deep: new Map(),
		own: new Map(),
	};
	for (const point of points) {
		const chain = foldersAbove(point.path, base);
		folders.chains.set(point, chain);
		pushTo(folders.own, folderOf(point.path), point);
		for (const folder of chain) {
			pushTo(folders.deep, folder, point);
		}
	}
	return folders;
}

// The middle of the notes of each folder, its subfolders included.
function middles(folders: Folders): Map<string, Centre> {
	const centres = new Map<string, Centre>();
	for (const [folder, members] of folders.deep) {
		let across = 0;
		let down = 0;
		for (const point of members) {
			across += point.x ?? 0;
			down += point.y ?? 0;
		}
		centres.set(folder, {
			across: across / members.length,
			down: down / members.length,
		});
	}
	return centres;
}

function pullTogether(folders: Folders, alpha: number): void {
	const centres = middles(folders);
	for (const [point, chain] of folders.chains) {
		let strength = COHESION * alpha;
		for (const folder of chain) {
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
	members: GraphPoint[];
}

// Moves every note of `block` by `push`.
function nudge(block: Block, push: Centre): void {
	for (const point of block.members) {
		point.vx = (point.vx ?? 0) + push.across;
		point.vy = (point.vy ?? 0) + push.down;
	}
}

// Pushes apart two blocks side by side whose circles overlap.
function separate(pair: [Block, Block], alpha: number): void {
	const [one, other] = pair;
	const across = other.across - one.across;
	const down = other.down - one.down;
	const distance = Math.hypot(across, down) || 1;
	const overlap = one.radius + other.radius + SIBLING_GAP - distance;
	if (overlap <= 0) {
		return;
	}
	const step = (overlap * SEPARATION * alpha) / distance;
	nudge(other, { across: across * step, down: down * step });
	nudge(one, { across: -across * step, down: -down * step });
}

// The blocks inside each folder: the cluster of its own notes, and its
// subfolders.
function blocksOf(folders: Folders): Map<string, Block[]> {
	const blocks = new Map<string, Block[]>();
	for (const halo of halosAround(folders.points, folders.base)) {
		const members = folders.deep.get(halo.folder) ?? [];
		pushTo(blocks, folderOf(halo.folder), { ...halo, members });
	}
	for (const [folder, members] of folders.own) {
		pushTo(blocks, folder, { ...circleAround(members), members });
	}
	return blocks;
}

function pushApart(folders: Folders, alpha: number): void {
	for (const blocks of blocksOf(folders).values()) {
		for (const [index, one] of blocks.entries()) {
			for (const other of blocks.slice(index + 1)) {
				separate([one, other], alpha);
			}
		}
	}
}

// Groups the notes by folder below `base` (`''`: the vault root).
export function folderGroups(base: string): Force<GraphPoint, GraphEdge> {
	let folders = foldersOf([], base);
	const force = (alpha: number): void => {
		pullTogether(folders, alpha);
		pushApart(folders, alpha);
	};
	force.initialize = (nodes: GraphPoint[]): void => {
		folders = foldersOf(nodes, base);
	};
	return force;
}
