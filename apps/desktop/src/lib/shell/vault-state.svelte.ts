// SPDX-License-Identifier: GPL-3.0-or-later
// The notes of the open vault as the shell shows them, read again when
// they may have changed, and the settings of this device.
import { SvelteSet } from 'svelte/reactivity';

import type { DeviceSettings } from '../bindings/DeviceSettings.ts';
import type { NoteEntry } from '../bindings/NoteEntry.ts';
import type { VaultTree } from '../bindings/VaultTree.ts';
import { noteOpened, pinNote, recentNotes } from '../vault/explorer.ts';
import { createLinkedNote, linkedNoteTitle } from '../vault/links.ts';
import { buildTree, splitArchive } from '../vault/tree.ts';
import { deviceSettings, vaultTree } from '../vault/vault.ts';

export class VaultState {
	tree = $state<VaultTree>({ folders: [], notes: [], pinned: [] });
	// Paths of the notes opened last on this device, newest first.
	recent = $state<string[]>([]);
	// Bumped on every read of the tree: the backlinks may have changed.
	loads = $state(0);
	settings = $state<DeviceSettings>();

	readonly root = $derived(buildTree(this.tree));
	// Notebook and Archive sections of the explorer.
	readonly sections = $derived(splitArchive(this.root));
	readonly notePaths: ReadonlySet<string> = $derived(
		new SvelteSet(this.tree.notes.map((note) => note.path)),
	);

	readonly pinnedPaths: ReadonlySet<string> = $derived(
		new SvelteSet(this.tree.pinned),
	);

	// The sections of the explorer, as notes with their titles.
	readonly pinnedNotes = $derived(this.entries(this.tree.pinned));
	readonly recentNotes = $derived(this.entries(this.recent));

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
		this.loadRecent();
	}

	private entries(paths: string[]): NoteEntry[] {
		return paths.flatMap((path) =>
			this.tree.notes.filter((note) => note.path === path));
	}

	private loadRecent(): void {
		recentNotes()
			.then((recent) => {
				this.recent = recent;
			})
			.catch(() => undefined);
	}

	// A note shown in the focused pane becomes the most recent.
	async opened(path: string): Promise<void> {
		this.recent = await noteOpened(path);
	}

	async togglePin(path: string): Promise<void> {
		this.setTree(await pinNote(path, !this.pinnedPaths.has(path)));
	}

	readonly updateSettings = (settings: DeviceSettings): void => {
		this.settings = settings;
	};

	setTree(tree: VaultTree): void {
		this.tree = tree;
		this.loads += 1;
	}

	// Reads the tree again; the Rust core refreshes its index first.
	// The recent notes too: a rename or the trash may have changed them.
	async load(): Promise<void> {
		this.setTree(await vaultTree());
		this.loadRecent();
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
