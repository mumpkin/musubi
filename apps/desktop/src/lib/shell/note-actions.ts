// SPDX-License-Identifier: GPL-3.0-or-later
// What the shell does to notes beyond opening them: trash, pin, open a
// note just written, follow a link to a missing note. Errors show in the
// status bar.
import { trashFolder, trashNote } from '../vault/trash.ts';
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

	readonly togglePin = (path: string): void => {
		this.run(async () => {
			await this.files.togglePin(path);
		});
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
