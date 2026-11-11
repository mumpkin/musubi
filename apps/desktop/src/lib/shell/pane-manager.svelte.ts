// SPDX-License-Identifier: GPL-3.0-or-later
// The panes of the main area and what happens to them: open a note, switch
// mode, split, close, save, reload. Reactive through Svelte runes.
import { type EditorMode, modeIndicator } from '@musubi/editor';
import { tick } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';

import {
	MAX_PANES,
	otherMode,
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

	readonly focused = $derived(this.panes[this.focusedIndex] ?? this.panes[0]);
	readonly currentPath = $derived(this.focused?.path ?? '');
	readonly statusMode = $derived(
		this.focused?.mode === 'editing' ? modeIndicator(this.editorMode) : 'LEC',
	);

	constructor(firstNote: string) {
		this.panes = [{ path: firstNote, mode: 'reading', loads: 0 }];
	}

	get canSplit(): boolean {
		return this.panes.length < MAX_PANES;
	}

	open(path: string): void {
		const pane = this.panes[this.focusedIndex];
		if (pane) {
			pane.path = path;
			pane.draft = undefined;
			pane.line = undefined;
		}
	}

	toggleMode(index: number): void {
		const pane = this.panes[index];
		if (pane) {
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
			this.panes.splice(index, 1);
			this.focusAfterRender(0);
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
	// read them again, except those with unsaved changes.
	reload(): void {
		for (const pane of this.panes) {
			if (pane.draft === undefined) {
				pane.loads += 1;
				this.bump(pane.path);
			}
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

	private bump(path: string): void {
		this.revisions.set(path, (this.revisions.get(path) ?? 0) + 1);
	}

	events(index: number): PaneEvents {
		return {
			focus: () => {
				this.focusedIndex = index;
			},
			open: (path) => {
				this.open(path);
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
		element.querySelector<HTMLElement>('.reading-view, .cm-content')
			?.focus();
	}
}
