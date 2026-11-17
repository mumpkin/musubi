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

// Adds `item` to the list of `key` in `lists`.
export function pushTo<Item>(
	lists: Map<string, Item[]>,
	key: string,
	item: Item,
): void {
	const list = lists.get(key);
	if (list) {
		list.push(item);
	} else {
		lists.set(key, [item]);
	}
}

// The subfolders of each folder that holds notes of `points`, or above
// one, by path, from the folder `base` down.
export function subfoldersOf(
	points: GraphPoint[],
	base: string,
): Map<string, string[]> {
	const children = new Map<string, string[]>();
	const known = new Set<string>([base, '']);
	for (const point of points) {
		let folder = folderOf(point.path);
		while (!known.has(folder)) {
			known.add(folder);
			const parent = folderOf(folder);
			pushTo(children, parent, folder);
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

// The circle of each folder below `base` (`''`: the vault root) around
// its notes and its subfolders as they are now, from the outer folders to
// the inner ones. `base` itself has no circle.
export function halosAround(points: GraphPoint[], base: string): Halo[] {
	const children = subfoldersOf(points, base);
	const notes = new Map<string, Halo[]>();
	for (const point of points) {
		const reach = reachOf(point);
		pushTo(notes, reach.folder, reach);
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
	for (const folder of children.get(base) ?? []) {
		around(folder, 1);
	}
	return halos.sort((first, second) => first.depth - second.depth);
}

// The other notes of the group of `point`, grouped below `base`: its
// folder with the subfolders in it. A note right in `base` is alone.
export function groupMembers(
	points: GraphPoint[],
	point: GraphPoint,
	base: string | undefined,
): GraphPoint[] {
	const folder = folderOf(point.path);
	if (base === undefined || folder === base) {
		return [];
	}
	return points.filter((other) =>
		other !== point && other.path.startsWith(`${folder}/`));
}
