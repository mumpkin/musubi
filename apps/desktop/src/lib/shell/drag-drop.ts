// SPDX-License-Identifier: GPL-3.0-or-later
// Drag and drop in the explorer, with Pragmatic drag and drop (Atlassian,
// Apache-2.0): an entry dragged onto a folder (or the Notebook section, for
// the root) moves there.
import {
	draggable,
	dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';

import { parentOf } from '../vault/tree.ts';

export interface DragEntry {
	path: string;
	kind: 'note' | 'folder';
}

export interface DropFolder {
	// The folder that takes the entries, `''` for the vault root.
	folder: string;
	onMove: (path: string, folder: string) => void;
}

// The entry a drag carries, if it comes from the explorer.
function entryOf(
	data: Record<string | symbol, unknown>,
): DragEntry | undefined {
	const { path, kind } = data;
	if (typeof path !== 'string' || (kind !== 'note' && kind !== 'folder')) {
		return undefined;
	}
	return { path, kind };
}

// Whether `entry` may move into `folder`: not where it already is, and a
// folder not into itself.
export function canMoveInto(entry: DragEntry, folder: string): boolean {
	const isInside = entry.kind === 'folder'
		&& (folder === entry.path || folder.startsWith(`${entry.path}/`));
	return !isInside && parentOf(entry.path) !== folder;
}

// Svelte action: the element can be dragged, carrying `entry`.
export function dragEntry(element: HTMLElement, entry: DragEntry) {
	let current = entry;
	const cleanup = draggable({
		element,
		getInitialData: () => ({ ...current }),
	});
	return {
		update(next: DragEntry) {
			current = next;
		},
		destroy: cleanup,
	};
}

// Svelte action: entries dropped on the element move into a folder. The
// element has `data-drop-target` while an entry that can move is over it.
export function dropFolder(
	element: HTMLElement,
	target: DropFolder | undefined,
) {
	let current = target;
	const leave = (): void => {
		delete element.dataset.dropTarget;
	};
	const cleanup = dropTargetForElements({
		element,
		canDrop: ({ source }) => {
			const entry = entryOf(source.data);
			return entry !== undefined && current !== undefined
				&& canMoveInto(entry, current.folder);
		},
		onDragEnter: () => {
			element.dataset.dropTarget = '';
		},
		onDragLeave: leave,
		onDrop: ({ source }) => {
			leave();
			const entry = entryOf(source.data);
			if (entry && current) {
				current.onMove(entry.path, current.folder);
			}
		},
	});
	return {
		update(next: DropFolder | undefined) {
			current = next;
		},
		destroy: cleanup,
	};
}
