// SPDX-License-Identifier: GPL-3.0-or-later
// The vault commands behind the operations of the tree editor.
import { moveEntry, retitleNote } from '../vault/explorer.ts';
import { trashFolder, trashNote } from '../vault/trash.ts';
import { createFolder, createNote } from '../vault/vault.ts';
import type { TreeCommands } from './tree-apply.ts';

export const vaultCommands: TreeCommands = {
	createNote,
	createFolder,
	retitle: retitleNote,
	move: moveEntry,
	trash: async (path, kind) => {
		await (kind === 'note' ? trashNote(path) : trashFolder(path));
	},
};
