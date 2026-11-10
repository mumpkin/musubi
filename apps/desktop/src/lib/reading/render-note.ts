// SPDX-License-Identifier: GPL-3.0-or-later
import { invoke } from '@tauri-apps/api/core';

import type { NoteView } from '../bindings/NoteView.ts';

// Compiles a note of the vault, by its path from the vault root.
export async function renderNote(path: string): Promise<NoteView> {
	return invoke<NoteView>('render_note', { path });
}
