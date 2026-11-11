// SPDX-License-Identifier: GPL-3.0-or-later
// The notes of the open vault as the shell shows them, read again when
// they may have changed, and the settings of this device.
import { SvelteSet } from 'svelte/reactivity';

import type { DeviceSettings } from '../bindings/DeviceSettings.ts';
import type { VaultTree } from '../bindings/VaultTree.ts';
import { createLinkedNote, linkedNoteTitle } from '../vault/links.ts';
import { buildTree } from '../vault/tree.ts';
import { deviceSettings, vaultTree } from '../vault/vault.ts';

export class VaultState {
	tree = $state<VaultTree>({ folders: [], notes: [] });
	// Bumped on every read of the tree: the backlinks may have changed.
	loads = $state(0);
	settings = $state<DeviceSettings>();

	readonly root = $derived(buildTree(this.tree));
	readonly notePaths: ReadonlySet<string> = $derived(
		new SvelteSet(this.tree.notes.map((note) => note.path)),
	);

	// Seconds of pause before saving, or `undefined` without autosave.
	readonly autosaveDelay = $derived(
		this.settings?.autosave
			? this.settings.autosaveDelaySeconds
			: undefined,
	);

	constructor(tree: VaultTree) {
		this.tree = tree;
		deviceSettings()
			.then((loaded) => {
				this.settings = loaded;
			})
			.catch(() => undefined);
	}

	setTree(tree: VaultTree): void {
		this.tree = tree;
		this.loads += 1;
	}

	// Reads the tree again; the Rust core refreshes its index first.
	async load(): Promise<void> {
		this.setTree(await vaultTree());
	}

	// Before following a link: creates the note if it is missing, titled
	// from the link.
	async prepareLink(path: string, text: string): Promise<void> {
		if (!this.notePaths.has(path)) {
			await createLinkedNote(path, linkedNoteTitle(path, text));
			await this.load();
		}
	}
}
