// SPDX-License-Identifier: GPL-3.0-or-later
// The trash of the vault, kept by the Rust core in `.musubi/trash/`.
import { invoke } from '@tauri-apps/api/core';

import type { TrashEntry } from '../bindings/TrashEntry.ts';

export async function trashNote(path: string): Promise<TrashEntry> {
	return invoke<TrashEntry>('trash_note', { path });
}

export async function trashEntries(): Promise<TrashEntry[]> {
	return invoke<TrashEntry[]>('trash_entries');
}

// Restores an entry; resolves to the path of the note.
export async function restoreNote(id: string): Promise<string> {
	return invoke<string>('restore_note', { id });
}

// Deletes an entry for good, or every entry without `id`.
export async function deleteForGood(id?: string): Promise<void> {
	await invoke('delete_trash_entries', { id: id ?? null });
}

// `2026-11-10T14:03:22Z` as a local date and time.
export function deletionTime(deletedAt: string): string {
	return new Date(deletedAt).toLocaleString(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short',
	});
}
