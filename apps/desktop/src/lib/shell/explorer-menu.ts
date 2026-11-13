// SPDX-License-Identifier: GPL-3.0-or-later
// What the context menu of the explorer offers for a note, a folder or
// the empty space: the mouse way to the actions that the keyboard reaches
// with `Space` shortcuts and the tree editor.
import { isArchived } from '../vault/tree.ts';
import type { IconName } from './actions.ts';

export interface MenuItem {
	label: string;
	icon?: IconName;
	// Asked again before running: the label to show the second time.
	confirmation?: string;
	run: () => void;
}

export type EntryKind = 'note' | 'folder';

export interface MenuTarget {
	path: string;
	kind: EntryKind;
	isPinned: boolean;
}

export interface EntryActions {
	onOpen: (path: string) => void;
	onPin: (path: string) => void;
	onArchive: (path: string) => void;
	onCreate: (kind: EntryKind, folder: string) => void;
	onDelete: (path: string) => void;
	// Opens the tree editor on the line of the entry.
	onRename: (path: string) => void;
	// Reviews the flashcards of a note or a folder.
	onReview: (path: string) => void;
}

function createItems(
	folder: string,
	actions: Pick<EntryActions, 'onCreate'>,
): MenuItem[] {
	return [
		{
			label: 'New note',
			icon: 'newNote',
			run: () => {
				actions.onCreate('note', folder);
			},
		},
		{
			label: 'New folder',
			icon: 'newFolder',
			run: () => {
				actions.onCreate('folder', folder);
			},
		},
	];
}

function sharedItems(path: string, actions: EntryActions): MenuItem[] {
	return [
		{
			label: 'Review the flashcards',
			icon: 'cards',
			run: () => {
				actions.onReview(path);
			},
		},
		{
			label: 'Rename or move',
			icon: 'edit',
			run: () => {
				actions.onRename(path);
			},
		},
		{
			label: isArchived(path) ? 'Unarchive' : 'Archive',
			icon: isArchived(path) ? 'unarchive' : 'archive',
			run: () => {
				actions.onArchive(path);
			},
		},
		{
			label: 'Move to the trash',
			icon: 'trash',
			run: () => {
				actions.onDelete(path);
			},
		},
	];
}

export function entryMenu(
	target: MenuTarget,
	actions: EntryActions,
): MenuItem[] {
	const { path } = target;
	if (target.kind === 'folder') {
		return [...createItems(path, actions), ...sharedItems(path, actions)];
	}
	return [
		{
			label: 'Open',
			icon: 'read',
			run: () => {
				actions.onOpen(path);
			},
		},
		{
			label: target.isPinned ? 'Unpin' : 'Pin',
			icon: 'pin',
			run: () => {
				actions.onPin(path);
			},
		},
		...sharedItems(path, actions),
	];
}

// The empty space of the explorer: new entries at the vault root.
export function rootMenu(actions: EntryActions): MenuItem[] {
	return createItems('', actions);
}

// The menu for the row that `target` is in, or for the empty space.
export function menuAt(
	target: EventTarget | null,
	pinnedPaths: ReadonlySet<string>,
	actions: EntryActions,
): { items: MenuItem[]; origin: HTMLElement | undefined } {
	const row = target instanceof Element
		? target.closest<HTMLElement>('[data-path]')
		: null;
	const path = row?.dataset.path;
	if (!row || path === undefined) {
		return { items: rootMenu(actions), origin: undefined };
	}
	const kind = row.dataset.kind === 'folder' ? 'folder' : 'note';
	const isPinned = pinnedPaths.has(path);
	return { items: entryMenu({ path, kind, isPinned }, actions), origin: row };
}

// The keys that open the menu of the focused entry.
export function isMenuKey(event: KeyboardEvent): boolean {
	return event.key === 'ContextMenu'
		|| (event.shiftKey && event.key === 'F10');
}

// What the menu button of the explorer header needs.
export interface HeaderActions {
	isEditing: boolean;
	onToggleTree: () => void;
	onCreate: (kind: EntryKind, folder: string) => void;
	onReview: (scope: string) => void;
}

// The menu of the explorer header: the tree as text, new entries at the
// root, and a review of the vault.
export function headerMenu(actions: HeaderActions): MenuItem[] {
	return [
		{
			label: actions.isEditing
				? 'Back to the tree'
				: 'Edit the tree as text',
			icon: actions.isEditing ? 'read' : 'edit',
			run: actions.onToggleTree,
		},
		...createItems('', actions),
		{
			label: 'Review the flashcards',
			icon: 'cards',
			run: () => {
				actions.onReview('');
			},
		},
	];
}
