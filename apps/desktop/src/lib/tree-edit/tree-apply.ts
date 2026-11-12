// SPDX-License-Identifier: GPL-3.0-or-later
// Runs the operations of an edited tree one by one, as oil.nvim does. The
// path of each entry is followed as folders move or get new names.
import type { Operation, Place } from './tree-plan.ts';
import type { TreeEntry } from './tree-text.ts';

// The vault commands the operations need; replaced in tests.
export interface TreeCommands {
	createNote: (folder: string, title: string) => Promise<string>;
	createFolder: (parent: string, name: string) => Promise<string>;
	retitle: (path: string, title: string) => Promise<string>;
	move: (path: string, to: string) => Promise<string>;
	trash: (path: string, kind: TreeEntry['kind']) => Promise<void>;
}

export interface AppliedTree {
	// Notes that changed path, for the panes that show them.
	moved: { from: string; to: string }[];
	// Notes and folders now in the trash.
	trashed: string[];
	// The error that stopped the operations, if any: those before it stay.
	error?: string;
}

const join = (folder: string, name: string): string =>
	folder === '' ? name : `${folder}/${name}`;

class PathTracker {
	readonly current = new Map<number, string>();
	readonly created = new Map<number, string>();
	private readonly entries: ReadonlyMap<number, TreeEntry>;

	constructor(entries: ReadonlyMap<number, TreeEntry>) {
		this.entries = entries;
		for (const entry of entries.values()) {
			this.current.set(entry.id, entry.path);
		}
	}

	pathOf(place: Place): string {
		if (place === 'root') {
			return '';
		}
		const path = 'entry' in place
			? this.current.get(place.entry)
			: this.created.get(place.line);
		return path ?? '';
	}

	pathOfEntry(id: number): string {
		return this.current.get(id) ?? '';
	}

	isFolder(path: string): boolean {
		const isEntry = [...this.current].some(([id, current]) =>
			current === path && this.entries.get(id)?.kind === 'folder');
		return isEntry || [...this.created.values()].includes(path);
	}

	// `from` became `to`: so did everything inside it.
	moved(from: string, to: string): void {
		for (const paths of [this.current, this.created]) {
			for (const [key, path] of paths) {
				if (path === from) {
					paths.set(key, to);
				} else if (path.startsWith(`${from}/`)) {
					paths.set(key, `${to}${path.slice(from.length)}`);
				}
			}
		}
	}
}

// Runs operations, following the paths of the entries.
class Applier {
	readonly tracker: PathTracker;
	readonly trashed: string[] = [];
	private readonly commands: TreeCommands;

	constructor(
		entries: ReadonlyMap<number, TreeEntry>,
		commands: TreeCommands,
	) {
		this.tracker = new PathTracker(entries);
		this.commands = commands;
	}

	async run(operation: Operation): Promise<void> {
		const { tracker, commands } = this;
		if (operation.kind === 'create') {
			const parent = tracker.pathOf(operation.parent);
			const path = operation.isFolder
				? await this.createFolders(parent, operation.name)
				: await commands.createNote(parent, operation.name);
			tracker.created.set(operation.line, path);
			return;
		}
		const path = tracker.pathOfEntry(operation.id);
		if (operation.kind === 'trash') {
			await commands.trash(path, path.endsWith('.typ') ? 'note' : 'folder');
			this.trashed.push(path);
			return;
		}
		const moved = operation.kind === 'retitle'
			? await commands.retitle(path, operation.title)
			: await commands.move(
					path,
					join(tracker.pathOf(operation.parent), operation.name),
				);
		tracker.moved(path, moved);
	}

	// Creates the folders of `path` that are missing; returns the last one.
	private async createFolders(parent: string, path: string) {
		let folder = parent;
		for (const part of path.split('/').map((piece) => piece.trim())) {
			const existing = join(folder, part);
			folder = this.tracker.isFolder(existing)
				? existing
				: await this.commands.createFolder(folder, part);
			this.tracker.created.set(-this.tracker.created.size - 1, folder);
		}
		return folder;
	}
}

export async function applyPlan(
	operations: Operation[],
	entries: ReadonlyMap<number, TreeEntry>,
	commands: TreeCommands,
): Promise<AppliedTree> {
	const applier = new Applier(entries, commands);
	const { tracker, trashed } = applier;
	let error: string | undefined;
	try {
		for (const operation of operations) {
			await applier.run(operation);
		}
	} catch (failure: unknown) {
		error = String(failure);
	}
	const moved = [...entries.values()]
		.filter((entry) => entry.kind === 'note')
		.map((entry) => ({
			from: entry.path,
			to: tracker.pathOfEntry(entry.id),
		}))
		.filter(({ from, to }) => from !== to && !trashed.includes(from));
	return { moved, trashed, ...(error === undefined ? {} : { error }) };
}
