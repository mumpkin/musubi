// SPDX-License-Identifier: GPL-3.0-or-later
// What an edited tree asks for: the operations that turn the vault into
// it, in an order that works (oil.nvim does the same with its diff).
import { checkLines, folderName } from './tree-check.ts';
import { type LineError, parseTree, type TreeLine } from './tree-parse.ts';
import type { TreeEntry } from './tree-text.ts';

// A folder of the edited tree: one already there (by id), one created by a
// new line (by line index), or the vault root.
export type Place = { entry: number } | { line: number } | 'root';

export type Operation
	= | {
		kind: 'create';
		line: number;
		parent: Place;
		// May be a path, `a/b/Title`, creating the missing folders.
		name: string;
		isFolder: boolean;
		// Where it goes, for the summary.
		target: string;
	}
	| { kind: 'retitle'; id: number; title: string }
	| { kind: 'move'; id: number; parent: Place; name: string; target: string }
	| { kind: 'trash'; id: number };

export interface TreePlan {
	operations: Operation[];
	errors: LineError[];
}

function placeOf(lines: TreeLine[], index: number): Place {
	const line = lines[index];
	if (!line) {
		return 'root';
	}
	return line.id === undefined ? { line: index } : { entry: line.id };
}

function isSamePlace(place: Place, parent: number): boolean {
	return place === 'root'
		? parent === 0
		: 'entry' in place && place.entry === parent;
}

// The path each line stands for in the edited tree, for the summary.
function targets(lines: TreeLine[]): string[] {
	const paths: string[] = [];
	for (const line of lines) {
		const name = line.isFolder ? `${folderName(line.name)}/` : line.name;
		const parent = paths[line.parent]?.replace(/\/$/u, '');
		paths.push(parent === undefined ? name : `${parent}/${name}`);
	}
	return paths;
}

function depthOf(lines: TreeLine[], index: number): number {
	let depth = 0;
	for (let parent = lines[index]?.parent ?? -1; parent !== -1;) {
		depth += 1;
		parent = lines[parent]?.parent ?? -1;
	}
	return depth;
}

interface PlannedMove {
	depth: number;
	operation: Operation;
}

// The new title and the move of the entry of line `index`, if any.
function entryChanges(
	lines: TreeLine[],
	index: number,
	entry: TreeEntry,
): { retitle?: Operation; move?: PlannedMove } {
	const line = lines[index];
	if (!line) {
		return {};
	}
	const parent = placeOf(lines, line.parent);
	const name = entry.kind === 'folder' ? folderName(line.name) : line.name;
	const isRenamed = name !== entry.name;
	const isMoved = !isSamePlace(parent, entry.parent)
		|| (entry.kind === 'folder' && isRenamed);
	const target = targets(lines)[index] ?? name;
	return {
		...(entry.kind === 'note' && isRenamed
			? { retitle: { kind: 'retitle', id: entry.id, title: name } }
			: {}),
		...(isMoved
			? {
					move: {
						depth: depthOf(lines, index),
						operation: { kind: 'move', id: entry.id, parent, name, target },
					},
				}
			: {}),
	};
}

// Moves and new titles of the entries still there.
function changesOf(
	lines: TreeLine[],
	entries: ReadonlyMap<number, TreeEntry>,
): Operation[] {
	const retitles: Operation[] = [];
	const moves: PlannedMove[] = [];
	for (const [index, line] of lines.entries()) {
		const entry = entries.get(line.id ?? 0);
		const changes = entry ? entryChanges(lines, index, entry) : {};
		const { retitle, move } = changes;
		if (retitle) {
			retitles.push(retitle);
		}
		if (move) {
			moves.push(move);
		}
	}
	// A folder reaches its place before what moves into it.
	moves.sort((left, right) => left.depth - right.depth);
	return [...retitles, ...moves.map((move) => move.operation)];
}

function createsOf(lines: TreeLine[]): Operation[] {
	const paths = targets(lines);
	return lines.flatMap((line, index) => line.id === undefined
		? [{
				kind: 'create' as const,
				line: index,
				parent: placeOf(lines, line.parent),
				name: line.isFolder ? folderName(line.name) : line.name,
				isFolder: line.isFolder,
				target: paths[index] ?? line.name,
			}]
		: []);
}

// Entries whose line is gone, except those inside a folder that goes too.
function trashesOf(
	lines: TreeLine[],
	entries: ReadonlyMap<number, TreeEntry>,
): TreeEntry[] {
	const kept = new Set(lines.map((line) => line.id));
	const isGone = (id: number): boolean => id !== 0 && !kept.has(id);
	return [...entries.values()].filter((entry) =>
		isGone(entry.id) && !isGone(entry.parent));
}

export function planChanges(
	text: string,
	entries: ReadonlyMap<number, TreeEntry>,
): TreePlan {
	const parsed = parseTree(text, entries);
	const errors = [...parsed.errors, ...checkLines(parsed.lines, entries)];
	if (errors.length > 0) {
		return { operations: [], errors };
	}
	const trashed = trashesOf(parsed.lines, entries);
	const trash = (entry: TreeEntry): Operation =>
		({ kind: 'trash', id: entry.id });
	return {
		operations: [
			// Notes go first, freeing their names; folders last, once what
			// they held and stays has moved out.
			...trashed.filter((entry) => entry.kind === 'note').map(trash),
			...createsOf(parsed.lines),
			...changesOf(parsed.lines, entries),
			...trashed.filter((entry) => entry.kind === 'folder').map(trash),
		],
		errors: [],
	};
}
