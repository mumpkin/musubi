// SPDX-License-Identifier: GPL-3.0-or-later
// What the shell does to notes beyond opening them: trash, pin, open a
// note just written, follow a link to a missing note. Errors show in the
// status bar.
import type { VaultTree } from '../bindings/VaultTree.ts';
import { archiveEntry } from '../vault/explorer.ts';
import { trashFolder, trashNote } from '../vault/trash.ts';
import { isArchived } from '../vault/tree.ts';
import type { TrashActions } from './actions.ts';
import type { PaneManager } from './pane-manager.svelte.ts';
import type { VaultState } from './vault-state.svelte.ts';

export class NoteActions {
	private readonly files: VaultState;
	private readonly manager: PaneManager;

	constructor(files: VaultState, manager: PaneManager) {
		this.files = files;
		this.manager = manager;
		// A link to a missing note creates it, titled from the link.
		manager.followLink = (path, text) => {
			this.run(async () => {
				await files.prepareLink(path, text);
				manager.open(path);
			});
		};
	}

	// What the trash section of the explorer needs.
	get trashActions(): TrashActions {
		return {
			revision: this.files.loads,
			onRestored: this.restored,
			onError: this.showMessage,
		};
	}

	readonly showMessage = (text: string): void => {
		this.manager.message = text;
	};

	// Moves a note, or a folder (a path without `.typ`), to the trash.
	readonly deleteNote = (path: string): void => {
		if (!path.endsWith('.typ')) {
			this.deleteFolder(path);
			return;
		}
		const next = this.files.tree.notes.find((note) => note.path !== path);
		this.run(async () => {
			const entry = await trashNote(path);
			this.manager.forget(path, next?.path ?? '');
			this.showMessage(`Moved ${entry.title} to the trash`);
			await this.files.load();
		});
	};

	// The vault root is not a folder that goes to the trash.
	readonly deleteFolder = (folder: string): void => {
		if (folder === '') {
			this.showMessage('This note is not in a folder');
			return;
		}
		const inside = (path: string): boolean =>
			path.startsWith(`${folder}/`);
		const next = this.files.tree.notes.find((note) => !inside(note.path));
		this.run(async () => {
			const entry = await trashFolder(folder);
			for (const pane of this.manager.panes.filter((open) =>
				inside(open.path))) {
				this.manager.forget(pane.path, next?.path ?? '');
			}
			this.showMessage(`Moved the folder ${entry.title} to the trash`);
			await this.files.load();
		});
	};

	// Archives a note or a folder, or puts it back from the archive. The
	// panes that show it follow it.
	readonly toggleArchive = (path: string): void => {
		this.run(async () => {
			const moved = await archiveEntry(path, isArchived(path));
			for (const pane of [...this.manager.panes]) {
				if (pane.path === path) {
					this.manager.forget(pane.path, moved);
				} else if (pane.path.startsWith(`${path}/`)) {
					const rest = pane.path.slice(path.length);
					this.manager.forget(pane.path, `${moved}${rest}`);
				}
			}
			this.showMessage(isArchived(moved)
				? `Archived ${moved}`
				: `Moved back to ${moved}`);
			await this.files.load();
		});
	};

	// Opens a vault from its folder with `open`, unless a pane has unsaved
	// changes, which closing this vault would lose.
	vaultSwitcher(
		open: (folder: string) => Promise<void>,
	): (folder: string) => void {
		return (folder) => {
			if (this.manager.panes.some((pane) => pane.draft !== undefined)) {
				this.showMessage('Save or discard the changes before switching');
				return;
			}
			this.run(async () => open(folder));
		};
	}

	readonly togglePin = (path: string): void => {
		this.run(async () => {
			await this.files.togglePin(path);
		});
	};

	// A note or a folder was created: the tree shows it, a note opens.
	readonly created = (tree: VaultTree, note: string | undefined): void => {
		this.files.setTree(tree);
		if (note !== undefined) {
			this.manager.open(note);
		}
	};

	// Opens a note that was just written (restored, tutorial) once the tree
	// knows it.
	readonly restored = (note: string | Promise<string>): void => {
		this.run(async () => {
			const path = await note;
			await this.files.load();
			// A restored folder only shows again in the explorer.
			if (path.endsWith('.typ')) {
				this.manager.open(path);
			}
		});
	};

	private run(task: () => Promise<void>): void {
		task().catch((error: unknown) => {
			this.showMessage(String(error));
		});
	}
}
