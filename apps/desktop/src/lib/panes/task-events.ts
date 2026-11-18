// SPDX-License-Identifier: GPL-3.0-or-later
// A task switched from the reading view: the note is saved at once, and
// every pane that shows it is read again.
import { invoke } from '@tauri-apps/api/core';

import type { PaneManager } from './pane-manager.svelte.ts';
import type { PaneEvents } from './panes.ts';

type TaskEvents = Pick<PaneEvents, 'toggleTask'>;

const UNSAVED = 'Save the note before checking a task: it has unsaved changes';

// Switches the task at `offset` of the note at `path` between to do and
// done, unless an editor holds unsaved changes of the note.
async function toggleTask(
	manager: PaneManager,
	path: string,
	offset: number,
): Promise<void> {
	const isEdited = manager.panes
		.some((pane) => pane.path === path && pane.draft !== undefined);
	if (isEdited) {
		manager.message = UNSAVED;
		manager.reload();
		return;
	}
	try {
		await invoke('toggle_task', { path, offset });
		manager.saved(path);
	} catch (error) {
		manager.message = String(error);
		manager.reload();
	}
}

export function taskEvents(manager: PaneManager, index: number): TaskEvents {
	return {
		toggleTask: (offset) => {
			const path = manager.panes[index]?.path ?? '';
			toggleTask(manager, path, offset).catch(() => undefined);
		},
	};
}
