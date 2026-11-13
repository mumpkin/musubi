// SPDX-License-Identifier: GPL-3.0-or-later
// The panes of the main area and what happens to them: open a note, switch
// mode, split, close, save, reload. Reactive through Svelte runes.
import { type EditorMode } from '@musubi/editor';
import { tick } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';

import type { PaneAction } from './actions.ts';
import { modeEvents } from './pane-modes.ts';
import {
	MAX_PANES,
	otherMode,
	paneActions,
	type PaneEvents,
	type PaneState,
} from './panes.ts';

const UNSAVED = 'Unsaved changes: :w saves them, :q! discards them';

export class PaneManager {
	panes = $state<PaneState[]>([]);
	focusedIndex = $state(0);
	editorMode = $state<EditorMode>('normal');
	message = $state('');
	// Saves so far: titles may have changed, the tree is read again.
	saves = $state(0);
	// Saves of each note, by path: reading panes render again on a change.
	readonly revisions = new SvelteMap<string, number>();
	// Saves or discards the unsaved changes of `pane`, as the user answers;
	// resolves to `false` if they stay. The shell replaces it with a dialog.
	askUnsaved: (pane: PaneState) => Promise<boolean> = async () =>
		Promise.resolve(false);

	// Follows a link from a reading pane; the shell replaces it to create
	// missing notes.
	followLink: (path: string, text: string) => void = (path) => {
		this.open(path);
	};

	readonly focused = $derived(this.panes[this.focusedIndex] ?? this.panes[0]);
	readonly currentPath = $derived(this.focused?.path ?? '');

	constructor(firstNote: string) {
		// Without a note to show, the pane opens on the home screen.
		const mode = firstNote === '' ? 'home' : 'reading';
		this.panes = [{ path: firstNote, mode, loads: 0 }];
	}

	get canSplit(): boolean {
		return this.panes.length < MAX_PANES;
	}

	// Opens `path` in the focused pane, at the source `line` if given.
	// Unsaved changes of another note are asked about first.
	open(path: string, line?: number): void {
		const index = this.focusedIndex;
		this.leave(index, path, () => {
			this.show(index, path, line);
		});
	}

	// Before the note of pane `index` gives way to `path`: unsaved changes
	// of another note are saved or discarded first, as the user answers.
	leave(index: number, path: string, then: () => void): void {
		const pane = this.panes[index];
		if (pane?.draft === undefined || pane.path === path) {
			then();
			return;
		}
		this.askUnsaved(pane)
			.then((isDone) => {
				if (isDone) {
					then();
				}
			})
			.catch((error: unknown) => {
				this.message = String(error);
			});
	}

	private show(index: number, path: string, line?: number): void {
		const pane = this.panes[index];
		if (pane) {
			pane.path = path;
			pane.draft = undefined;
			pane.line = line;
			pane.loads += 1;
			// A note opened from the graph or home shows in reading mode.
			if (pane.mode === 'graph' || pane.mode === 'home') {
				pane.mode = 'reading';
			}
		}
	}

	// Opens `path` from a side panel (backlinks) and gives the keyboard to
	// its pane, so that `j` and `k` move in the note at once.
	readonly openFocused = (path: string): void => {
		this.open(path);
		this.focusAfterRender(this.focusedIndex);
	};

	// `Space c`: a review of the flashcards of `scope` in pane `index`.
	review(index: number, scope: string): void {
		const pane = this.panes[index];
		if (pane && pane.draft === undefined) {
			pane.mode = 'review';
			pane.scope = scope;
			this.focusAfterRender(index);
		} else if (pane) {
			this.message = 'Save the note before reviewing';
		}
	}

	// A review of `scope` in the focused pane.
	readonly reviewFocused = (scope: string): void => {
		this.review(this.focusedIndex, scope);
	};

	// The pane `index` goes back to reading, from the graph or a review.
	read(index: number): void {
		const pane = this.panes[index];
		if (pane) {
			pane.mode = 'reading';
			this.focusAfterRender(index);
		}
	}

	// `Space g`: the graph in pane `index`, or back to its note.
	toggleGraph(index: number): void {
		const pane = this.panes[index];
		if (pane && pane.draft === undefined) {
			pane.mode = pane.mode === 'graph' ? 'reading' : 'graph';
			this.focusAfterRender(index);
		} else if (pane) {
			this.message = 'Save the note before showing the graph';
		}
	}

	toggleMode(index: number): void {
		const pane = this.panes[index];
		// The home screen has no note to edit.
		if (pane && pane.mode !== 'home') {
			pane.mode = otherMode(pane.mode);
			this.editorMode = 'normal';
			this.focusAfterRender(index);
		}
	}

	// A second pane, on the same note in the other mode.
	split(): void {
		const pane = this.panes[this.focusedIndex];
		if (pane && this.canSplit) {
			this.panes.push({
				path: pane.path,
				mode: otherMode(pane.mode),
				loads: 0,
			});
			this.focusAfterRender(this.panes.length - 1);
		}
	}

	close(index: number): void {
		if (this.panes.length > 1) {
			this.leave(index, '', () => {
				this.panes.splice(index, 1);
				this.focusAfterRender(0);
			});
		}
	}

	// `:q`: unsaved changes need `:q!`; the last pane goes back to reading.
	quit(index: number, force: boolean): void {
		const pane = this.panes[index];
		if (!pane) {
			return;
		}
		if (pane.draft !== undefined && !force) {
			this.message = UNSAVED;
			return;
		}
		pane.draft = undefined;
		if (this.panes.length > 1) {
			this.close(index);
		} else {
			pane.mode = 'reading';
			pane.loads += 1;
			this.focusAfterRender(index);
		}
	}

	saved(path: string, renamed = path): void {
		for (const pane of this.panes.filter((entry) => entry.path === path)) {
			pane.path = renamed;
		}
		this.bump(renamed);
		this.saves += 1;
		this.message = `Saved ${renamed}`;
	}

	// Notes may have changed on disk while the window was in the background:
	// read them again, except those with unsaved changes. The panes stay as
	// they are: cursor, editor and undo history.
	reload(): void {
		for (const pane of this.panes) {
			if (pane.draft === undefined) {
				this.bump(pane.path);
			}
		}
	}

	// The note at `path` is gone: its panes show `replacement` instead, or
	// the home screen for `''`.
	forget(path: string, replacement: string): void {
		for (const pane of this.panes.filter((entry) => entry.path === path)) {
			pane.path = replacement;
			pane.mode = replacement === '' ? 'home' : 'reading';
			pane.draft = undefined;
			pane.line = undefined;
			pane.loads += 1;
		}
	}

	setLine(index: number, line: number | undefined): void {
		const pane = this.panes[index];
		if (pane) {
			pane.line = line;
		}
	}

	// Double click on a block: edit the note there.
	edit(index: number, line: number): void {
		const pane = this.panes[index];
		if (pane) {
			pane.line = line;
			pane.mode = 'editing';
			this.focusAfterRender(index);
		}
	}

	// Buttons of the header of pane `index`.
	actionsOf(index: number): PaneAction[] {
		const pane = this.panes[index];
		if (!pane) {
			return [];
		}
		return paneActions(pane, {
			canSplit: this.canSplit,
			toggleMode: () => {
				this.toggleMode(index);
			},
			split: () => {
				this.split();
			},
			close: () => {
				this.close(index);
			},
		});
	}

	private bump(path: string): void {
		this.revisions.set(path, (this.revisions.get(path) ?? 0) + 1);
	}

	events(index: number): PaneEvents {
		return {
			focus: () => {
				this.focusedIndex = index;
			},
			open: (path, text) => {
				this.followLink(path, text);
			},
			message: (text) => {
				this.message = text;
			},
			editorMode: (mode) => {
				this.editorMode = mode;
			},
			draft: (text) => {
				const pane = this.panes[index];
				if (pane) {
					pane.draft = text;
				}
			},
			saved: (path, renamed) => {
				this.saved(path, renamed);
			},
			quit: (force) => {
				this.quit(index, force);
			},
			line: (line) => {
				this.setLine(index, line);
			},
			edit: (line) => {
				this.edit(index, line);
			},
			...modeEvents(this, index),
		};
	}

	// The keyboard focus follows the pane, once its content is on screen.
	focusAfterRender(index: number): void {
		this.focusedIndex = index;
		tick()
			.then(() => {
				this.focusPane(index);
			})
			.catch(() => undefined);
	}

	focusPane(index: number): void {
		this.focusedIndex = (index + this.panes.length) % this.panes.length;
		const element = document.querySelectorAll<HTMLElement>('.pane')
			.item(this.focusedIndex);
		element.querySelector<HTMLElement>(
			'.home-view, .review-view, .reading-view, .cm-content, .graph-canvas',
		)
			?.focus();
	}
}
