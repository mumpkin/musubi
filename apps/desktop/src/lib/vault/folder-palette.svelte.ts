// SPDX-License-Identifier: GPL-3.0-or-later
// The colors of the folders of the open vault, shared by the explorer and
// the graph.
import { assignFolderColors, fallbackFolderColor } from './folder-colors.ts';

class FolderPalette {
	private colors = $state(new Map<string, string>());

	// The folders of the vault were read again.
	update(folders: readonly string[]): void {
		this.colors = assignFolderColors(folders);
	}

	// The color of `folder`; `undefined` for the vault root, whose notes
	// keep the default color.
	colorOf(folder: string): string | undefined {
		if (folder === '') {
			return undefined;
		}
		return this.colors.get(folder) ?? fallbackFolderColor(folder);
	}
}

export const folderPalette = new FolderPalette();
