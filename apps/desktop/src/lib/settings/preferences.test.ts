// SPDX-License-Identifier: GPL-3.0-or-later
import { invoke } from '@tauri-apps/api/core';
import { describe, expect, it, vi } from 'vitest';

import type { DeviceSettings } from '../bindings/DeviceSettings.ts';
import type { Preferences } from '../bindings/Preferences.ts';
import { changePreferences } from './commands.ts';
import { cssOf, fontFamily } from './preferences.ts';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/webview', () => ({
	getCurrentWebview: () => ({ setZoom: vi.fn() }),
}));

const preferences: Preferences = {
	interfaceScale: 100,
	readingFont: '',
	readingFontSize: 16,
	readingWidth: 72,
	lineSpacing: 160,
	editorFont: 'JetBrains Mono',
	editorFontSize: 15,
	softWrap: true,
	highlightCursorLine: false,
	indentWidth: 2,
	startScreen: 'lastNote',
};

describe('fontFamily', () => {
	it('keeps the default, generic families, and quotes other fonts', () => {
		expect(fontFamily('', 'monospace')).toBe('monospace');
		expect(fontFamily('serif', 'monospace')).toBe('serif');
		expect(fontFamily('Fira Code', 'monospace'))
			.toBe('"Fira Code", monospace');
	});
});

describe('cssOf', () => {
	it('turns the preferences into CSS variables', () => {
		const css = cssOf(preferences);
		expect(css.get('--reading-size')).toBe('16px');
		expect(css.get('--reading-width')).toBe('72ch');
		expect(css.get('--line-spacing')).toBe('1.6');
		expect(css.get('--editor-font')).toBe('"JetBrains Mono", monospace');
	});
});

describe('changePreferences', () => {
	it('builds a quick second change on the first one', async () => {
		const sent: Preferences[] = [];
		vi.mocked(invoke).mockImplementation(async (...call) => {
			const [, args] = call;
			const { preferences: next } = args as { preferences: Preferences };
			sent.push(next);
			return Promise.resolve({ preferences: next });
		});
		const settings = { preferences } as DeviceSettings;
		await Promise.all([
			changePreferences(settings, { readingFontSize: 20 }),
			changePreferences(settings, { lineSpacing: 180 }),
		]);
		expect(sent.at(-1)).toMatchObject({
			readingFontSize: 20,
			lineSpacing: 180,
		});
	});
});
