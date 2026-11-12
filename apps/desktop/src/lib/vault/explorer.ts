// SPDX-License-Identifier: GPL-3.0-or-later
// Calls to the commands of the explorer sections: pinned notes, kept in
// the vault, and recent notes, kept on this device.
import { invoke } from '@tauri-apps/api/core';

import type { VaultTree } from '../bindings/VaultTree.ts';

// Pins or unpins a note; resolves to the new tree.
export async function pinNote(
	path: string,
	pinned: boolean,
): Promise<VaultTree> {
	return invoke<VaultTree>('pin_note', { path, pinned });
}

// Archives a note or a folder, or puts it back; resolves to its new path.
export async function archiveEntry(
	path: string,
	unarchive: boolean,
): Promise<string> {
	return invoke<string>('archive_entry', { path, unarchive });
}

// Recent notes of the open vault, newest first.
export async function recentNotes(): Promise<string[]> {
	return invoke<string[]>('recent_notes');
}

// Puts a note first in the recent notes; resolves to them.
export async function noteOpened(path: string): Promise<string[]> {
	return invoke<string[]>('note_opened', { path });
}

// Gives a note a new title (heading and file name); resolves to its path.
export async function retitleNote(
	path: string,
	title: string,
): Promise<string> {
	return invoke<string>('retitle_note', { path, title });
}

// Moves a note or a folder to `to` (a note keeps its file name); resolves
// to its new path.
export async function moveEntry(path: string, to: string): Promise<string> {
	return invoke<string>('move_entry', { path, to });
}
