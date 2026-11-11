// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import { PaneManager } from './pane-manager.svelte.ts';

describe('PaneManager', () => {
	it('refuses to quit a pane with unsaved changes, unless forced', () => {
		const manager = new PaneManager('Note.typ');
		manager.toggleMode(0);
		manager.events(0).draft('= Changed');
		manager.quit(0, false);
		expect(manager.panes[0]?.mode).toBe('editing');
		expect(manager.message).toContain(':q!');
		manager.quit(0, true);
		expect(manager.panes[0]?.mode).toBe('reading');
		expect(manager.panes[0]?.draft).toBeUndefined();
	});

	it('closes the pane when there are two', () => {
		const manager = new PaneManager('Note.typ');
		manager.split();
		expect(manager.panes).toHaveLength(2);
		expect(manager.panes[1]?.mode).toBe('editing');
		manager.quit(1, false);
		expect(manager.panes).toHaveLength(1);
	});

	it('renders a note again after a save', () => {
		const manager = new PaneManager('Note.typ');
		manager.saved('Note.typ');
		manager.saved('Note.typ');
		expect(manager.revisions.get('Note.typ')).toBe(2);
	});

	it('follows a note renamed by its new title', () => {
		const manager = new PaneManager('Old.typ');
		manager.split();
		manager.saved('Old.typ', 'New.typ');
		expect(manager.panes.map((pane) => pane.path)).toEqual([
			'New.typ',
			'New.typ',
		]);
		// The same note stays open: the editor is kept, with its history.
		expect(manager.panes.map((pane) => pane.loads)).toEqual([0, 0]);
	});

	it('reloads only the panes without unsaved changes', () => {
		const manager = new PaneManager('Note.typ');
		manager.reload();
		expect(manager.revisions.get('Note.typ')).toBe(1);
		// The pane is not opened again: an editor keeps its history.
		expect(manager.panes[0]?.loads).toBe(0);
		manager.events(0).draft('unsaved');
		manager.reload();
		expect(manager.revisions.get('Note.typ')).toBe(1);
	});
});
