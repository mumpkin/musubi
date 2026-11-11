// SPDX-License-Identifier: GPL-3.0-or-later
// Calls to the theme commands of the Rust core.
import { invoke } from '@tauri-apps/api/core';

import type { ThemeEntry } from '../bindings/ThemeEntry.ts';

export async function importedThemes(): Promise<ThemeEntry[]> {
	return invoke<ThemeEntry[]>('imported_themes');
}

// Asks for a JSON file; resolves to the imported theme, `null` if
// cancelled.
export async function importTheme(): Promise<ThemeEntry | null> {
	return invoke<ThemeEntry | null>('import_theme');
}

export async function removeTheme(id: string): Promise<void> {
	await invoke('remove_theme', { id });
}

// `null` follows the light or dark preference of the system.
export async function chooseTheme(id: string | null): Promise<void> {
	await invoke('choose_theme', { id });
}
