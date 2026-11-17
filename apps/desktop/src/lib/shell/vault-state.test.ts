// SPDX-License-Identifier: GPL-3.0-or-later
import { invoke } from '@tauri-apps/api/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { VaultTree } from '../bindings/VaultTree.ts';
import { editorSettings } from '../editor/editor-settings.svelte.ts';
import { VaultState } from './vault-state.svelte.ts';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/webview', () => ({
	getCurrentWebview: () => ({ setZoom: vi.fn() }),
}));

const TREE: VaultTree = {
	folders: ['Maths'],
	notes: [
		{ path: 'Maths/A.typ', title: 'A' },
		{ path: 'B.typ', title: 'B' },
	],
	pinned: [],
};

// Answers of the Rust core, by command.
function core(): Map<string, unknown> {
	const answers = new Map<string, unknown>([
		['device_settings', {
			relativeLineNumbers: true,
			preferences: { readingFont: '', editorFont: '', interfaceScale: 100 },
		}],
		['recent_notes', ['B.typ', 'Gone.typ']],
		['conflicts', [{ note: 'B.typ', copy: 'B (conflict).typ' }]],
		['vault_tree', TREE],
		['pin_note', { ...TREE, pinned: ['B.typ'] }],
		['create_linked_note', undefined],
	]);
	vi.mocked(invoke).mockImplementation(async (command) =>
		Promise.resolve(answers.get(command)));
	return answers;
}

const settle = async () => {
	await new Promise((resolve) => setTimeout(resolve, 0));
};

describe('VaultState', () => {
	beforeEach(() => {
		vi.mocked(invoke).mockReset();
		core();
	});

	it('loads the settings, the recent notes and the conflicts', async () => {
		const state = new VaultState(TREE);
		await settle();
		expect(editorSettings.relativeLineNumbers).toBe(true);
		expect(state.recentNotes.map((note) => note.title)).toEqual(['B']);
		expect(state.conflictOf('B.typ')).toBe('B (conflict).typ');
		expect(state.conflictOf('Maths/A.typ')).toBeUndefined();
	});

	it('pins a note and reads the tree it gets back', async () => {
		const state = new VaultState(TREE);
		await state.togglePin('B.typ');
		expect(invoke).toHaveBeenCalledWith('pin_note', {
			path: 'B.typ',
			pinned: true,
		});
		expect(state.pinnedNotes.map((note) => note.path)).toEqual(['B.typ']);
	});

	it('creates the note of a link only when it is missing', async () => {
		const state = new VaultState(TREE);
		await state.prepareLink('B.typ', 'B');
		expect(invoke).not.toHaveBeenCalledWith(
			'create_linked_note',
			expect.anything(),
		);
		await state.prepareLink('New_note.typ', '');
		expect(invoke).toHaveBeenCalledWith('create_linked_note', {
			path: 'New_note.typ',
			title: 'New note',
		});
	});
});
