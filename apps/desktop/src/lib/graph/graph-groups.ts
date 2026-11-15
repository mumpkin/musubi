// SPDX-License-Identifier: GPL-3.0-or-later
// The circles of the folders of the graph, as the folders nest: each holds
// the notes of its folder and the circles of its subfolders, around the
// notes as they are now. Drawn every frame, they follow the notes.
import type { GraphPoint } from './graph-data.ts';
import { folderOf } from './graph-filter.ts';

// Room inside the edge of a circle, in units of the graph.
const PADDING = 8;
const HALF = 2;

export interface Centre {
	across: number;
	down: number;
}

export interface Halo extends Centre {
	folder: string;
	radius: number;
	// How deep the folder is: 1 for a folder at the vault root, 0 for a
	// note.
	depth: number;
}

// The subfolders of each folder that holds notes of `points`, or above
// one, by path.
export function subfoldersOf(points: GraphPoint[]): Map<string, string[]> {
	const children = new Map<string, string[]>();
	const known = new Set<string>(['']);
	for (const point of points) {
		let folder = folderOf(point.path);
		while (!known.has(folder)) {
			known.add(folder);
			const parent = folderOf(folder);
			children.set(parent, [...(children.get(parent) ?? []), folder]);
			folder = parent;
		}
	}
	for (const list of children.values()) {
		list.sort();
	}
	return children;
}

// Where a note reaches, as a circle: its dot, or around its pill.
function reachOf(point: GraphPoint): Halo {
	return {
		folder: folderOf(point.path),
		across: point.x ?? 0,
		down: point.y ?? 0,
		radius: point.halfWidth ?? point.radius,
		depth: 0,
	};
}

const leftOf = (item: Halo) => item.across - item.radius;
const rightOf = (item: Halo) => item.across + item.radius;
const topOf = (item: Halo) => item.down - item.radius;
const bottomOf = (item: Halo) => item.down + item.radius;

// A circle around every circle of `members`: around the middle of their
// box, wide enough for the farthest.
function enclose(members: Halo[]): Centre & { radius: number } {
	const across = (Math.min(...members.map(leftOf))
		+ Math.max(...members.map(rightOf))) / HALF;
	const down = (Math.min(...members.map(topOf))
		+ Math.max(...members.map(bottomOf))) / HALF;
	const radius = Math.max(...members.map((item) => Math.hypot(
		item.across - across,
		item.down - down,
	) + item.radius));
	return { across, down, radius };
}

// The circle around `points` as they are now, without room inside.
export function circleAround(
	points: GraphPoint[],
): Centre & { radius: number } {
	return enclose(points.map(reachOf));
}

// The circle of each folder around its notes and its subfolders as they
// are now, from the outer folders to the inner ones.
export function halosAround(points: GraphPoint[]): Halo[] {
	const children = subfoldersOf(points);
	const notes = new Map<string, Halo[]>();
	for (const point of points) {
		const reach = reachOf(point);
		notes.set(reach.folder, [...(notes.get(reach.folder) ?? []), reach]);
	}
	const halos: Halo[] = [];
	const around = (folder: string, depth: number): Halo => {
		const inner = (children.get(folder) ?? [])
			.map((child) => around(child, depth + 1));
		const circle = enclose([...(notes.get(folder) ?? []), ...inner]);
		const radius = circle.radius + PADDING;
		const halo = { folder, ...circle, radius, depth };
		halos.push(halo);
		return halo;
	};
	for (const folder of children.get('') ?? []) {
		around(folder, 1);
	}
	return halos.sort((first, second) => first.depth - second.depth);
}
