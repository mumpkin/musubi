// SPDX-License-Identifier: GPL-3.0-or-later
// Color themes: the built-in themes (GitHub and Ayu), and the CSS
// variables a theme sets on the window. A theme may leave colors out; they
// come from the default theme of the same scheme (`docs/themes.md`).
import { SYNTAX_TOKENS } from '@musubi/editor';

import type { ColorScheme } from '../bindings/ColorScheme.ts';
import type { Theme } from '../bindings/Theme.ts';
import ayuLight from './ayu-light.json';
import ayuMirage from './ayu-mirage.json';
import githubDark from './github-dark.json';
import githubLight from './github-light.json';

// The interface colors a theme sets, each as the CSS variable `--<name>`.
export const UI_COLORS = [
	'background',
	'foreground',
	'muted',
	'surface',
	'border',
	'accent',
	'selection',
	'hover',
	'error',
	'warning',
	'mark',
] as const;

export interface ThemeChoice {
	id: string;
	theme: Theme;
	// Imported themes can be removed; the default ones cannot.
	isImported: boolean;
}

export const DEFAULT_THEMES: ThemeChoice[] = [
	{ id: 'github-light', theme: githubLight as Theme, isImported: false },
	{ id: 'github-dark', theme: githubDark as Theme, isImported: false },
	{ id: 'ayu-light', theme: ayuLight as Theme, isImported: false },
	{ id: 'ayu-mirage', theme: ayuMirage as Theme, isImported: false },
];

const [LIGHT, DARK] = DEFAULT_THEMES;

// The default theme of `scheme`.
export function defaultTheme(scheme: ColorScheme): Theme {
	return (scheme === 'dark' ? DARK : LIGHT)?.theme ?? (githubLight as Theme);
}

// Every CSS variable of `theme`, missing colors taken from the default
// theme of its scheme.
export function cssVariables(theme: Theme): Map<string, string> {
	const fallback = defaultTheme(theme.colorScheme);
	const variables = new Map<string, string>();
	for (const name of UI_COLORS) {
		const color = theme.ui[name] ?? fallback.ui[name];
		if (color !== undefined) {
			variables.set(`--${name}`, color);
		}
	}
	for (const token of SYNTAX_TOKENS) {
		const color = theme.syntax[token] ?? fallback.syntax[token];
		if (color !== undefined) {
			variables.set(`--syntax-${token}`, color);
		}
	}
	return variables;
}

// Sets the colors of `theme` on `root` (the document element).
export function applyTheme(root: HTMLElement, theme: Theme): void {
	root.style.colorScheme = theme.colorScheme;
	for (const [name, value] of cssVariables(theme)) {
		root.style.setProperty(name, value);
	}
}
