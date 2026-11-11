// SPDX-License-Identifier: GPL-3.0-or-later
// The dialogs of the shell: command palette, trash, search and the
// creation of a note or a folder. While one is open, shortcuts stay off.
import type { SearchKind } from '../vault/search.ts';

export interface Creation {
	kind: 'note' | 'folder';
	folder: string;
}

export class ShellDialogs {
	creation = $state<Creation>();
	isCreating = $state(false);
	isPaletteOpen = $state(false);
	isTrashOpen = $state(false);
	search = $state<SearchKind>();

	// Whether a dialog that takes the keys is open.
	get isOpen(): boolean {
		return this.isPaletteOpen || this.isTrashOpen
			|| this.search !== undefined;
	}

	readonly startCreation = (kind: Creation['kind'], folder: string) => {
		this.creation = { kind, folder };
		this.isCreating = true;
	};
}
