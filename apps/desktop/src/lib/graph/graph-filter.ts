// SPDX-License-Identifier: GPL-3.0-or-later
// Narrows the graph of the vault: the notes linked to one note, or the
// notes of one folder.
import type { Graph } from '../bindings/Graph.ts';

// `all`: every note; `links`: the note and the notes it links to or that
// link to it; `folder`: the notes of its folder, and of its subfolders down
// to `depth` levels (`undefined`: all of them).
export interface GraphFilter {
	kind: 'all' | 'links' | 'folder';
	depth: number | undefined;
}

export const EVERY_NOTE: GraphFilter = { kind: 'all', depth: undefined };

// The folder of the note at `path`, `''` for the vault root.
export function folderOf(path: string): string {
	const slash = path.lastIndexOf('/');
	return slash === -1 ? '' : path.slice(0, slash);
}

function isInFolder(
	path: string,
	folder: string,
	depth: number | undefined,
): boolean {
	if (folder !== '' && !path.startsWith(`${folder}/`)) {
		return false;
	}
	const inside = folder === '' ? path : path.slice(folder.length + 1);
	const subfolders = inside.split('/').length - 1;
	return depth === undefined || subfolders <= depth;
}

// Indices of the notes `filter` keeps, around the note at `current`.
function keptNotes(
	graph: Graph,
	filter: GraphFilter,
	current: string,
): Set<number> {
	const all = [...graph.nodes.keys()];
	if (filter.kind === 'folder') {
		const folder = folderOf(current);
		return new Set(all.filter((index) => {
			const path = graph.nodes[index]?.path ?? '';
			return isInFolder(path, folder, filter.depth);
		}));
	}
	const centre = graph.nodes.findIndex((node) => node.path === current);
	if (filter.kind === 'all' || centre === -1) {
		return new Set(all);
	}
	const kept = new Set([centre]);
	for (const { source, target } of graph.links) {
		if (source === centre) {
			kept.add(target);
		} else if (target === centre) {
			kept.add(source);
		}
	}
	return kept;
}

// The part of `graph` that `filter` keeps around the note at `current`:
// nodes and the links between them, with their indices renumbered.
export function filterGraph(
	graph: Graph,
	filter: GraphFilter,
	current: string,
): Graph {
	const kept = keptNotes(graph, filter, current);
	const indices = new Map<number, number>();
	const nodes = [...graph.nodes.entries()]
		.filter(([index]) => kept.has(index))
		.map(([index, node]) => {
			indices.set(index, indices.size);
			return node;
		});
	const links = graph.links.flatMap(({ source, target }) => {
		const from = indices.get(source);
		const to = indices.get(target);
		return from === undefined || to === undefined
			? []
			: [{ source: from, target: to }];
	});
	return { nodes, links };
}
