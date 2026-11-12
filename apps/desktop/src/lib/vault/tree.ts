// SPDX-License-Identifier: GPL-3.0-or-later
// The explorer tree, built from the flat lists of the Rust core.
import type { NoteEntry } from '../bindings/NoteEntry.ts';
import type { VaultTree } from '../bindings/VaultTree.ts';

export interface FolderNode {
	name: string;
	// Path from the vault root, `''` for the root.
	path: string;
	folders: FolderNode[];
	notes: NoteEntry[];
}

// Folder of `path`, `''` at the root.
export function parentOf(path: string): string {
	const slash = path.lastIndexOf('/');
	return slash === -1 ? '' : path.slice(0, slash);
}

function nameOf(path: string): string {
	return path.slice(path.lastIndexOf('/') + 1);
}

const byName = (left: FolderNode, right: FolderNode): number =>
	left.name.localeCompare(right.name);

const byTitle = (left: NoteEntry, right: NoteEntry): number =>
	left.title.localeCompare(right.title);

export function buildTree(tree: VaultTree): FolderNode {
	const root: FolderNode = { name: '', path: '', folders: [], notes: [] };
	const nodes = new Map<string, FolderNode>([['', root]]);
	for (const path of tree.folders) {
		nodes.set(path, { name: nameOf(path), path, folders: [], notes: [] });
	}
	for (const path of tree.folders) {
		const node = nodes.get(path);
		const parent = nodes.get(parentOf(path)) ?? root;
		if (node) {
			parent.folders.push(node);
		}
	}
	for (const note of tree.notes) {
		(nodes.get(parentOf(note.path)) ?? root).notes.push(note);
	}
	for (const node of nodes.values()) {
		node.folders.sort(byName);
		node.notes.sort(byTitle);
	}
	return root;
}

// The folder of archived notes, at the vault root (`docs/vault-format.md`).
export const ARCHIVE_FOLDER = 'Archive';

export function isArchived(path: string): boolean {
	return path.startsWith(`${ARCHIVE_FOLDER}/`) || path === ARCHIVE_FOLDER;
}

// The tree without the archive, and the archive alone (`undefined` when
// nothing is archived).
export function splitArchive(root: FolderNode): {
	notebook: FolderNode;
	archive: FolderNode | undefined;
} {
	return {
		notebook: {
			...root,
			folders: root.folders.filter((folder) => !isArchived(folder.path)),
		},
		archive: root.folders.find((folder) => folder.path === ARCHIVE_FOLDER),
	};
}

export function titleIn(tree: VaultTree, path: string): string {
	return tree.notes.find((note) => note.path === path)?.title ?? path;
}
