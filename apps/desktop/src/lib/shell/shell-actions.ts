// SPDX-License-Identifier: GPL-3.0-or-later
// What each shortcut of the shell does (`shortcuts.ts` names them).
import type { TreeEditing } from '../tree-edit/tree-editing.svelte.ts';
import { parentOf } from '../vault/tree.ts';
import { openTutorial } from '../vault/vault.ts';
import type { ShellDialogs } from './dialogs.svelte.ts';
import type { NoteActions } from './note-actions.ts';
import type { PaneManager } from './pane-manager.svelte.ts';
import { showHome } from './pane-modes.ts';
import type { ShellAction } from './shortcuts.ts';
import type { SidePanels } from './side-panels.svelte.ts';

interface ShellParts {
	manager: PaneManager;
	panels: SidePanels;
	dialogs: ShellDialogs;
	notes: NoteActions;
	editing: TreeEditing;
}

type Actions = Partial<Record<ShellAction, () => void>>;

// The actions on notes and dialogs.
function noteActions(parts: ShellParts): Actions {
	const { manager, dialogs, notes } = parts;
	return {
		palette: () => {
			dialogs.isPaletteOpen = true;
		},
		deleteNote: () => {
			notes.deleteNote(manager.currentPath);
		},
		deleteFolder: () => {
			notes.deleteFolder(parentOf(manager.currentPath));
		},
		showTrash: () => {
			dialogs.isTrashOpen = true;
		},
		settings: () => {
			dialogs.isSettingsOpen = true;
		},
		openTutorial: () => {
			notes.restored(openTutorial());
		},
		findNote: () => {
			dialogs.search = 'titles';
		},
		searchText: () => {
			dialogs.search = 'text';
		},
		newNote: () => {
			dialogs.startCreation('note', parentOf(manager.currentPath));
		},
		toggleArchive: () => {
			notes.toggleArchive(manager.currentPath);
		},
		togglePin: () => {
			notes.togglePin(manager.currentPath);
		},
	};
}

// The actions that change the mode of the focused pane.
function modeActions(parts: ShellParts): Actions {
	const { manager, panels, editing } = parts;
	return {
		toggleMode: () => {
			if (panels.isInExplorer()) {
				editing.toggle(manager.currentPath);
			} else {
				manager.toggleMode(manager.focusedIndex);
			}
		},
		toggleGraph: () => {
			manager.toggleGraph(manager.focusedIndex);
		},
		review: () => {
			manager.reviewFocused('');
		},
		reviewNote: () => {
			manager.reviewFocused(manager.currentPath);
		},
		home: () => {
			showHome(manager, manager.focusedIndex);
		},
	};
}

// The actions on panes and panels.
function layoutActions(parts: ShellParts): Actions {
	const { manager, panels } = parts;
	return {
		toggleExplorer: () => {
			panels.toggleExplorer();
		},
		toggleBacklinks: () => {
			panels.toggleBacklinks();
		},
		split: () => {
			manager.split();
		},
		splitBelow: () => {
			manager.split('vertical');
		},
		closePane: () => {
			manager.close(manager.focusedIndex);
		},
		nextPane: () => {
			manager.focusPane(manager.focusedIndex + 1);
		},
		leftPanel: () => {
			panels.move(-1);
		},
		rightPanel: () => {
			panels.move(1);
		},
	};
}

export function shellActions(
	parts: ShellParts,
): Record<ShellAction, () => void> {
	return {
		...noteActions(parts),
		...modeActions(parts),
		...layoutActions(parts),
	} as Record<ShellAction, () => void>;
}

// Whether a key is text being typed, not a shortcut: in a dialog or a
// field, or in insert mode of the editor the key goes to. The editor is
// found from the target of the key: a focus flag can be stale when an
// editor is rebuilt while it has the focus.
export function typingCheck(
	parts: ShellParts,
): (event: KeyboardEvent) => boolean {
	const { manager, dialogs, editing } = parts;
	return (event) => {
		const { target } = event;
		if (dialogs.isOpen || target instanceof HTMLInputElement) {
			return true;
		}
		if (target instanceof Element && target.closest('.tree-editor')) {
			return editing.mode === 'insert';
		}
		return target instanceof Element
			&& target.closest('.pane .cm-editor') !== null
			&& manager.editorMode === 'insert';
	};
}
