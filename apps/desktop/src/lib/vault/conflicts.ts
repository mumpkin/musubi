// SPDX-License-Identifier: GPL-3.0-or-later
// Calls to the sync conflict commands of the Rust core.
import { invoke } from '@tauri-apps/api/core';

import type { Conflict } from '../bindings/Conflict.ts';
import type { Keep } from '../bindings/Keep.ts';

// The conflict copies made by sync tools in the open vault.
export async function listConflicts(): Promise<Conflict[]> {
	return invoke<Conflict[]>('conflicts');
}

// Keeps one version of the note of `copy`; the other goes to the trash.
export async function resolveConflict(copy: string, keep: Keep) {
	await invoke('resolve_conflict', { copy, keep });
}
