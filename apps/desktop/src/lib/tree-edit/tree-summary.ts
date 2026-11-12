// SPDX-License-Identifier: GPL-3.0-or-later
// The operations of an edited tree as the confirmation dialog lists them,
// as oil.nvim does: `CREATE Ideas/`, `MOVE Physics/ → Maths/Physics/`.
import type { Operation } from './tree-plan.ts';
import type { TreeEntry } from './tree-text.ts';

export type ChangeLabel = 'CREATE' | 'RENAME' | 'MOVE' | 'TRASH';

export interface ChangeLine {
	label: ChangeLabel;
	text: string;
}

function shown(entry: TreeEntry | undefined): string {
	if (!entry) {
		return '';
	}
	const folder = entry.path.slice(0, entry.path.lastIndexOf('/') + 1);
	return entry.kind === 'folder'
		? `${entry.path}/`
		: `${folder}${entry.name}`;
}

function describe(
	operation: Operation,
	entries: ReadonlyMap<number, TreeEntry>,
): ChangeLine {
	if (operation.kind === 'create') {
		return { label: 'CREATE', text: operation.target };
	}
	const entry = entries.get(operation.id);
	if (operation.kind === 'trash') {
		return { label: 'TRASH', text: shown(entry) };
	}
	if (operation.kind === 'retitle') {
		return {
			label: 'RENAME',
			text: `${entry?.name ?? ''} → ${operation.title}`,
		};
	}
	const parentOf = (path: string): string =>
		path.replace(/\/$/u, '').replace(/(?:^|\/)[^/]*$/u, '');
	const isRename = entry?.kind === 'folder'
		&& parentOf(operation.target) === parentOf(entry.path);
	return {
		label: isRename ? 'RENAME' : 'MOVE',
		text: `${shown(entry)} → ${operation.target}`,
	};
}

export function summary(
	operations: Operation[],
	entries: ReadonlyMap<number, TreeEntry>,
): ChangeLine[] {
	return operations.map((operation) => describe(operation, entries));
}
