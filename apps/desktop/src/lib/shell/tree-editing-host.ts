// SPDX-License-Identifier: GPL-3.0-or-later
// The tree editor of the explorer, wired to the shell: panes follow the
// notes it moves or trashes, and the tree is read again.
import { tick } from 'svelte';

import type { AppliedTree } from '../tree-edit/tree-apply.ts';
import { TreeEditing } from '../tree-edit/tree-editing.svelte.ts';
import type { PaneManager } from './pane-manager.svelte.ts';
import type { SidePanels } from './side-panels.svelte.ts';
import type { VaultState } from './vault-state.svelte.ts';

async function followChanges(
	result: AppliedTree,
	files: VaultState,
	manager: PaneManager,
): Promise<void> {
	for (const { from, to } of result.moved) {
		manager.saved(from, to);
	}
	await files.load();
	const next = files.tree.notes[0]?.path ?? '';
	for (const trashed of result.trashed) {
		for (const pane of manager.panes.filter((open) =>
			open.path === trashed || open.path.startsWith(`${trashed}/`))) {
			manager.forget(pane.path, next);
		}
	}
}

export function treeEditing(
	files: VaultState,
	manager: PaneManager,
	panels: SidePanels,
): TreeEditing {
	return new TreeEditing({
		root: () => files.root,
		applied: async (result) => followChanges(result, files, manager),
		open: (path) => {
			manager.open(path);
		},
		message: (text) => {
			manager.message = text;
		},
		left: () => {
			tick()
				.then(() => {
					panels.explorerList?.focusList();
				})
				.catch(() => undefined);
		},
	});
}
