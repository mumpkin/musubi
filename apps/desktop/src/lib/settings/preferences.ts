// SPDX-License-Identifier: GPL-3.0-or-later
// Applies the preferences of the device to the window: CSS variables for
// the reading view and the editor, the zoom of the whole interface, and
// the options every editor follows.
import { getCurrentWebview } from '@tauri-apps/api/webview';

import type { Preferences } from '../bindings/Preferences.ts';
import { editorSettings } from '../editor/editor-settings.svelte.ts';

// Fonts offered by name in the settings: the generic families of CSS.
export const FONT_FAMILIES = ['sans-serif', 'serif', 'monospace'] as const;
const READING_FALLBACK = 'system-ui, sans-serif';
const EDITOR_FALLBACK = 'monospace';
const PERCENT = 100;

// The CSS `font-family` of `font`: the default one when empty, a generic
// family as it is, any other font quoted, before the default one.
export function fontFamily(font: string, fallback: string): string {
	if (font === '') {
		return fallback;
	}
	return (FONT_FAMILIES as readonly string[]).includes(font)
		? font
		: `"${font}", ${fallback}`;
}

// The CSS variables the preferences set.
export function cssOf(preferences: Preferences): Map<string, string> {
	return new Map([
		['--reading-font', fontFamily(preferences.readingFont, READING_FALLBACK)],
		['--reading-size', `${String(preferences.readingFontSize)}px`],
		['--reading-width', `${String(preferences.readingWidth)}ch`],
		['--line-spacing', String(preferences.lineSpacing / PERCENT)],
		['--editor-font', fontFamily(preferences.editorFont, EDITOR_FALLBACK)],
		['--editor-size', `${String(preferences.editorFontSize)}px`],
	]);
}

let appliedScale: number | undefined;

export function applyPreferences(preferences: Preferences): void {
	const { style } = document.documentElement;
	for (const [name, value] of cssOf(preferences)) {
		style.setProperty(name, value);
	}
	editorSettings.softWrap = preferences.softWrap;
	editorSettings.highlightCursorLine = preferences.highlightCursorLine;
	editorSettings.indentWidth = preferences.indentWidth;
	const scale = preferences.interfaceScale / PERCENT;
	if (scale !== appliedScale) {
		appliedScale = scale;
		getCurrentWebview().setZoom(scale).catch(() => undefined);
	}
}
