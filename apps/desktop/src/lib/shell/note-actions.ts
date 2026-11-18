// SPDX-License-Identifier: GPL-3.0-or-later
// What the shell does to notes beyond opening them: trash, pin, open a
// note just written, follow a link to a missing note. Errors show in the
// status bar.
import type { Conflict } from '../bindings/Conflict.ts';
import type { VaultTree } from '../bindings/VaultTree.ts';
import {
	type MissingLinkChoice,
	MissingLinkPrompt,
} from '../dialogs/missing-link-prompt.svelte.ts';
import { UnsavedPrompt } from '../dialogs/unsaved-prompt.svelte.ts';
import type { PaneManager } from '../panes/pane-manager.svelte.ts';
import type { PaneState } from '../panes/panes.ts';
import type { TrashActions } from '../ui/actions.ts';
import { archiveEntry, moveEntry } from '../vault/explorer.ts';
import { nearNote, retargetLinks } from '../vault/missing-links.ts';
import { trashFolder, trashNote } from '../vault/trash.ts';
import { isArchived, parentOf, titleIn } from '../vault/tree.ts';
import { writeNote } from '../vault/vault.ts';
import type { VaultState } from './vault-state.svelte.ts';

export class NoteActions {
	// Asked before a note with unsaved changes leaves its pane.
	readonly unsaved = new UnsavedPrompt();
	// Asked before following a link to a missing note, when in doubt.
	readonly missing = new MissingLinkPrompt();
	private readonly files: VaultState;
	private readonly manager: PaneManager;

	constructor(files: VaultState, manager: PaneManager) {
		this.files = files;
		this.manager = manager;
		manager.askUnsaved = this.settleUnsaved;
		// A link to a missing note creates it, titled from the link, unless
		// a note with a near name exists or folders would be created.
		manager.followLink = (path, text) => {
			this.run(async () => {
				const target = await this.targetOf(path, text);
				if (target !== undefined) {
					manager.open(target);
				}
			});
		};
	}

	// The note to open for a link to `path`: the note itself, the near note
	// or the note created, as asked; `undefined` when cancelled.
	private async targetOf(
		path: string,
		text: string,
	): Promise<string | undefined> {
		const { files } = this;
		if (files.notePaths.has(path)) {
			return path;
		}
		const near = nearNote(path, files.notePaths);
		const folder = parentOf(path);
		const isNewFolder = folder !== ''
			&& !files.tree.folders.includes(folder);
		const choice = near === undefined && !isNewFolder
			? 'create'
			: await this.missing.ask({
					path,
					near,
					newFolder: isNewFolder ? folder : undefined,
				});
		return this.settleMissing(choice, { path, text, near });
	}

	private async settleMissing(
		choice: MissingLinkChoice,
		link: { path: string; text: string; near: string | undefined },
	): Promise<string | undefined> {
		if (choice === 'cancel') {
			return undefined;
		}
		if (choice === 'create' || link.near === undefined) {
			await this.files.prepareLink(link.path, link.text);
			return link.path;
		}
		if (choice === 'fix') {
			await retargetLinks(link.path, link.near);
			await this.files.load();
			this.manager.reload();
		}
		return link.near;
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
		this.run(async () => {
			const entry = await trashNote(path);
			this.manager.forget(path, '');
			this.showMessage(`Moved ${entry.title} to the trash`);
			await this.files.load();
			// Links to it changed in other notes: the panes read them again.
			this.manager.reload();
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
		this.run(async () => {
			const entry = await trashFolder(folder);
			for (const pane of this.manager.panes.filter((open) =>
				inside(open.path))) {
				this.manager.forget(pane.path, '');
			}
			this.showMessage(`Moved the folder ${entry.title} to the trash`);
			await this.files.load();
			// Links to it changed in other notes: the panes read them again.
			this.manager.reload();
		});
	};

	// Archives a note or a folder, or puts it back from the archive. The
	// panes that show it follow it.
	readonly toggleArchive = (path: string): void => {
		this.run(async () => {
			const moved = await archiveEntry(path, isArchived(path));
			this.followMove(path, moved);
			this.showMessage(isArchived(moved)
				? `Archived ${moved}`
				: `Moved back to ${moved}`);
			await this.files.load();
		});
	};

	// Moves a note or a folder into `folder` (`''` for the root), as a drag
	// and drop does; links follow.
	readonly moveInto = (path: string, folder: string): void => {
		const name = path.slice(path.lastIndexOf('/') + 1);
		this.run(async () => {
			const to = folder === '' ? name : `${folder}/${name}`;
			const moved = await moveEntry(path, to);
			this.followMove(path, moved);
			this.showMessage(`Moved to ${moved}`);
			await this.files.load();
			this.manager.reload();
		});
	};

	// The panes showing `from`, or a note inside it, follow it to `to`.
	private followMove(from: string, to: string): void {
		for (const pane of [...this.manager.panes]) {
			if (pane.path === from) {
				this.manager.forget(pane.path, to);
			} else if (pane.path.startsWith(`${from}/`)) {
				const rest = pane.path.slice(from.length);
				this.manager.forget(pane.path, `${to}${rest}`);
			}
		}
	}

	// Opens a vault from its folder with `open`, unless a pane has unsaved
	// changes, which closing this vault would lose.
	vaultSwitcher(
		open: (folder: string) => Promise<void>,
	): (folder: string) => void {
		return (folder) => {
			this.run(async () => {
				const unsaved = this.manager.panes
					.filter((pane) => pane.draft !== undefined);
				for (const pane of unsaved) {
					if (!await this.settleUnsaved(pane)) {
						return;
					}
				}
				await open(folder);
			});
		};
	}

	// Asks what to do with the unsaved changes of `pane`, and does it;
	// resolves to `false` if the user stays on the note.
	readonly settleUnsaved = async (pane: PaneState): Promise<boolean> => {
		const title = titleIn(this.files.tree, pane.path);
		const choice = await this.unsaved.ask(title);
		if (choice === 'cancel') {
			return false;
		}
		if (choice === 'save' && pane.draft !== undefined) {
			const saved = await writeNote(pane.path, pane.draft);
			this.manager.saved(pane.path, saved);
		}
		pane.draft = undefined;
		return true;
	};

	// Opens the note of `conflict` beside its conflict copy.
	readonly showConflict = (conflict: Conflict): void => {
		this.manager.open(conflict.note);
		this.manager.events(this.manager.focusedIndex).conflict(conflict.copy);
	};

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
			// Links to it changed in other notes: the panes read them again.
			this.manager.reload();
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
