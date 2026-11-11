// SPDX-License-Identifier: GPL-3.0-or-later
// What the shell does to notes beyond opening them: trash, pin, open a
// note just written, follow a link to a missing note. Errors show in the
// status bar.
import { trashNote } from '../vault/trash.ts';
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

	readonly deleteNote = (path: string): void => {
		const next = this.files.tree.notes.find((note) => note.path !== path);
		this.run(async () => {
			const entry = await trashNote(path);
			this.manager.forget(path, next?.path ?? '');
			this.showMessage(`Moved ${entry.title} to the trash`);
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
			this.manager.open(path);
		});
	};

	private run(task: () => Promise<void>): void {
		task().catch((error: unknown) => {
			this.showMessage(String(error));
		});
	}
}
