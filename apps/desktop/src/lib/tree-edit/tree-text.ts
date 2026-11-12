// SPDX-License-Identifier: GPL-3.0-or-later
// The vault tree as text, as oil.nvim shows a folder: one line per entry,
// indented under its folder, folders ending with `/`, notes by title. Each
// line starts with a hidden id, `/12 `, so that a cut and paste keeps the
// entry it stands for.
import type { FolderNode } from '../vault/tree.ts';

export type EntryKind = 'note' | 'folder';

export interface TreeEntry {
	id: number;
	kind: EntryKind;
	// Path from the vault root: `Maths/Analyse.typ`, `Maths`.
	path: string;
	// The title of a note, the name of a folder.
	name: string;
	// Id of the folder holding it, `0` for the vault root.
	parent: number;
}

export interface TreeText {
	text: string;
	entries: Map<number, TreeEntry>;
}

// One level of the tree.
export const INDENT = '  ';

// The id at the start of a line, after its indentation.
export const ID_PATTERN = /^(?<indent>\s*)\/(?<id>\d+) /u;

export const EMPTY_TREE: TreeText = { text: '', entries: new Map() };

export function idPrefix(id: number): string {
	return `/${String(id)} `;
}

export function treeText(root: FolderNode): TreeText {
	const lines: string[] = [];
	const entries = new Map<number, TreeEntry>();
	const add = (entry: Omit<TreeEntry, 'id'>, depth: number): number => {
		const id = entries.size + 1;
		entries.set(id, { ...entry, id });
		const suffix = entry.kind === 'folder' ? '/' : '';
		lines.push(
			`${INDENT.repeat(depth)}${idPrefix(id)}${entry.name}${suffix}`,
		);
		return id;
	};
	const walk = (folder: FolderNode, parent: number, depth: number) => {
		for (const child of folder.folders) {
			const id = add(
				{ kind: 'folder', path: child.path, name: child.name, parent },
				depth,
			);
			walk(child, id, depth + 1);
		}
		for (const note of folder.notes) {
			add(
				{ kind: 'note', path: note.path, name: note.title, parent },
				depth,
			);
		}
	};
	walk(root, 0, 0);
	return { text: lines.join('\n'), entries };
}
