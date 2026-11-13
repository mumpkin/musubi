// SPDX-License-Identifier: GPL-3.0-or-later
// The events of a pane that change its mode: back to reading, a review of
// its note, the comparison of its note with a conflict copy, and the
// merge by hand of such a conflict.
import type { PaneManager } from './pane-manager.svelte.ts';
import type { PaneEvents } from './panes.ts';

type ModeEvents = Pick<
	PaneEvents,
	'read' | 'review' | 'conflict' | 'resolved' | 'merge'
>;

// The note of pane `index` beside its conflict copy `copy`.
function showConflict(
	manager: PaneManager,
	index: number,
	copy: string,
): void {
	const pane = manager.panes[index];
	if (pane && pane.draft === undefined) {
		pane.mode = 'conflict';
		pane.scope = copy;
		manager.focusAfterRender(index);
	} else if (pane) {
		manager.message = 'Save the note before comparing its versions';
	}
}

// Merge by hand: the note in the editor, and its copy read beside it in a
// second pane, when there is room for one.
function merge(manager: PaneManager, index: number): void {
	const pane = manager.panes[index];
	const copy = pane?.scope;
	if (!pane || copy === undefined) {
		return;
	}
	pane.mode = 'editing';
	if (manager.canSplit) {
		manager.panes.push({ path: copy, mode: 'reading', loads: 0 });
	}
	manager.message = 'Merge by hand, save, then keep this version';
	manager.focusAfterRender(index);
}

export function modeEvents(manager: PaneManager, index: number): ModeEvents {
	return {
		read: () => {
			manager.read(index);
		},
		review: () => {
			manager.review(index, manager.panes[index]?.path ?? '');
		},
		conflict: (copy) => {
			showConflict(manager, index, copy);
		},
		// The note may have changed, and the copy is gone: the panes and
		// the tree are read again.
		resolved: () => {
			const path = manager.panes[index]?.path ?? '';
			manager.saved(path);
			manager.message = 'Conflict resolved';
			manager.read(index);
		},
		merge: () => {
			merge(manager, index);
		},
	};
}
