// SPDX-License-Identifier: GPL-3.0-or-later
// The theme of the window: the chosen one, or else the default theme that
// matches the light or dark preference of the system. Applied at once.
import { untrack } from 'svelte';

import type { ThemeEntry } from '../bindings/ThemeEntry.ts';
import { deviceSettings } from '../vault/vault.ts';
import {
	chooseTheme,
	importedThemes,
	importTheme,
	removeTheme,
} from './commands.ts';
import {
	applyTheme,
	DEFAULT_THEMES,
	defaultTheme,
	type ThemeChoice,
} from './themes.ts';

const DARK_QUERY = '(prefers-color-scheme: dark)';

export class ThemeState {
	imported = $state<ThemeEntry[]>([]);
	// Id of the chosen theme; `null` follows the system.
	chosen = $state<string | null>(null);
	isSystemDark = $state(false);
	// Bumped each time colors change: canvases redraw.
	revision = $state(0);

	readonly choices: ThemeChoice[] = $derived([
		...DEFAULT_THEMES,
		...this.imported.map((entry) => ({ ...entry, isImported: true })),
	]);

	readonly current = $derived(
		this.choices.find((choice) => choice.id === this.chosen)?.theme
		?? defaultTheme(this.isSystemDark ? 'dark' : 'light'),
	);

	// Reads the settings and applies the theme from now on.
	start(): void {
		const query = window.matchMedia(DARK_QUERY);
		this.isSystemDark = query.matches;
		query.addEventListener('change', (event) => {
			this.isSystemDark = event.matches;
		});
		$effect.root(() => {
			$effect(() => {
				applyTheme(document.documentElement, this.current);
				untrack(() => {
					this.revision += 1;
				});
			});
		});
		Promise.all([deviceSettings(), importedThemes()])
			.then(([settings, imported]) => {
				this.imported = imported;
				this.chosen = settings.theme;
			})
			.catch(() => undefined);
	}

	async choose(id: string | null): Promise<void> {
		await chooseTheme(id);
		this.chosen = id;
	}

	// Imports a theme file and uses it; resolves to its name, `undefined`
	// if cancelled.
	async importFile(): Promise<string | undefined> {
		const entry = await importTheme();
		if (!entry) {
			return undefined;
		}
		this.imported = [...this.imported, entry];
		await this.choose(entry.id);
		return entry.theme.name;
	}

	// Removes an imported theme; the chosen one falls back to the system.
	async remove(id: string): Promise<void> {
		await removeTheme(id);
		this.imported = this.imported.filter((entry) => entry.id !== id);
		if (this.chosen === id) {
			this.chosen = null;
		}
	}
}

export const themes = new ThemeState();
