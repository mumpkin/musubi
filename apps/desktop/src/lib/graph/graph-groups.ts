// SPDX-License-Identifier: GPL-3.0-or-later
// Notes grouped by folder, as the folders nest: each folder is a circle
// that holds a cluster of its own notes and the circles of its subfolders,
// set around it. Sizes are found from the deepest folders up, places from
// the vault root down. Notes are then pulled towards the cluster of their
// folder; links stay drawn across the groups.
import type { GraphPoint } from './graph-data.ts';
import { folderOf } from './graph-filter.ts';

// Sizes in units of the graph. A cluster of notes grows with the square
// root of its notes, as the area they cover.
const CLUSTER_BASE = 18;
const CLUSTER_PER_NOTE = 22;
// Room between the circles set around a folder, and inside its edge.
const GAP = 24;
const PADDING = 16;
const FULL_TURN = Math.PI + Math.PI;
const HALF = 2;

export interface Centre {
	across: number;
	down: number;
}

// The circle of a folder, drawn behind its notes.
export interface Halo extends Centre {
	folder: string;
	radius: number;
	// How deep the folder is: 1 for a folder at the vault root.
	depth: number;
}

export interface GroupLayout {
	// From the outer folders to the inner ones, as they are drawn.
	halos: Halo[];
	// The centre of the cluster of the notes of each folder.
	clusters: Map<string, Centre>;
	// The circle of the whole vault.
	radius: number;
}

function parentOf(folder: string): string {
	return folderOf(folder);
}

// Every folder that holds notes of `points`, with the folders above them,
// and the number of notes right in each.
function foldersOf(points: GraphPoint[]) {
	const notes = new Map<string, number>();
	const children = new Map<string, string[]>();
	const known = new Set<string>(['']);
	for (const point of points) {
		let folder = folderOf(point.path);
		notes.set(folder, (notes.get(folder) ?? 0) + 1);
		while (!known.has(folder)) {
			known.add(folder);
			const parent = parentOf(folder);
			children.set(parent, [...(children.get(parent) ?? []), folder]);
			folder = parent;
		}
	}
	for (const list of children.values()) {
		list.sort();
	}
	return { notes, children };
}

// What sits in a folder: the cluster of its own notes, and its subfolders.
interface Item {
	folder: string;
	isCluster: boolean;
	radius: number;
}

class Layout {
	private readonly radii = new Map<string, number>();
	readonly halos: Halo[] = [];
	readonly clusters = new Map<string, Centre>();

	private readonly tree: ReturnType<typeof foldersOf>;

	constructor(tree: ReturnType<typeof foldersOf>) {
		this.tree = tree;
	}

	private itemsOf(folder: string): Item[] {
		const own = this.tree.notes.get(folder) ?? 0;
		const cluster = own === 0
			? []
			: [{
					folder,
					isCluster: true,
					radius: CLUSTER_BASE + CLUSTER_PER_NOTE * Math.sqrt(own),
				}];
		const subfolders = (this.tree.children.get(folder) ?? [])
			.map((child) => ({
				folder: child,
				isCluster: false,
				radius: this.radiusOf(child),
			}));
		return [...cluster, ...subfolders];
	}

	// Where the items of a folder sit around its centre: each takes an arc
	// as wide as it is, and the ring is wide enough for neighbours not to
	// touch; alone, an item sits in the middle.
	private arrange(items: Item[]): { ring: number; angles: number[] } {
		if (items.length < HALF) {
			return { ring: 0, angles: items.map(() => 0) };
		}
		const widths = items.map((item) => item.radius * HALF + GAP);
		const around = widths.reduce((sum, width) => sum + width, 0);
		let travelled = 0;
		const angles = widths.map((width) => {
			const angle = (FULL_TURN * (travelled + width / HALF)) / around;
			travelled += width;
			return angle - Math.PI / HALF;
		});
		const ring = Math.max(...items.map((item, index) => {
			const next = (index + 1) % items.length;
			const gap = ((angles[next] ?? 0) - (angles[index] ?? 0)
				+ FULL_TURN) % FULL_TURN;
			const reach = item.radius + (items[next]?.radius ?? 0) + GAP;
			return reach / (HALF * Math.sin(gap / HALF));
		}));
		return { ring, angles };
	}

	radiusOf(folder: string): number {
		const known = this.radii.get(folder);
		if (known !== undefined) {
			return known;
		}
		const items = this.itemsOf(folder);
		const largest = Math.max(0, ...items.map((item) => item.radius));
		const radius = this.arrange(items).ring + largest + PADDING;
		this.radii.set(folder, radius);
		return radius;
	}

	place(folder: string, centre: Centre, depth: number): void {
		if (folder !== '') {
			this.halos.push({
				folder,
				...centre,
				radius: this.radiusOf(folder),
				depth,
			});
		}
		const items = this.itemsOf(folder);
		const { ring, angles } = this.arrange(items);
		for (const [index, item] of items.entries()) {
			const angle = angles[index] ?? 0;
			const spot = {
				across: centre.across + ring * Math.cos(angle),
				down: centre.down + ring * Math.sin(angle),
			};
			if (item.isCluster) {
				this.clusters.set(folder, spot);
			} else {
				this.place(item.folder, spot, depth + 1);
			}
		}
	}
}

// The nested circles of the folders of `points`, around the middle of the
// graph.
export function layoutGroups(points: GraphPoint[]): GroupLayout {
	const layout = new Layout(foldersOf(points));
	layout.place('', { across: 0, down: 0 }, 0);
	return {
		halos: layout.halos,
		clusters: layout.clusters,
		radius: layout.radiusOf(''),
	};
}
