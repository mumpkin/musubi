// SPDX-License-Identifier: GPL-3.0-or-later
// Calls to the settings commands of the Rust core.
import { invoke } from '@tauri-apps/api/core';

import type { DeviceSettings } from '../bindings/DeviceSettings.ts';
import type { Preferences } from '../bindings/Preferences.ts';

// Bounds of the settings, as the Rust core checks them.
export const AUTOSAVE_DELAY = { min: 1, max: 60 };
export const TRASH_RETENTION = { min: 0, max: 3650 };
export const NEW_CARDS_PER_DAY = { min: 0, max: 999 };

// Resolves to the settings of the device after the change.
export async function setAutosave(
	enabled: boolean,
	delaySeconds: number,
): Promise<DeviceSettings> {
	return invoke<DeviceSettings>('set_autosave', { enabled, delaySeconds });
}

// Resolves to the settings of the device after the change.
export async function setRelativeLineNumbers(
	relative: boolean,
): Promise<DeviceSettings> {
	return invoke<DeviceSettings>('set_relative_line_numbers', { relative });
}

// Resolves to the settings of the device after the change.
export async function setTrashSection(show: boolean): Promise<DeviceSettings> {
	return invoke<DeviceSettings>('set_trash_section', { show });
}

// The most new flashcards a day; resolves to the settings of the device.
export async function setNewCardsPerDay(
	count: number,
): Promise<DeviceSettings> {
	return invoke<DeviceSettings>('set_new_cards_per_day', { count });
}

// Days before trash entries are purged; `0` keeps them.
export async function setTrashRetention(days: number): Promise<void> {
	await invoke('set_trash_retention', { days });
}

// A whole number within `bounds`, or `undefined` for anything else.
export function boundedNumber(
	text: string,
	bounds: { min: number; max: number },
): number | undefined {
	const value = text.trim() === '' ? Number.NaN : Number(text);
	return Number.isInteger(value) && value >= bounds.min && value <= bounds.max
		? value
		: undefined;
}

// Bounds of the preferences, as the Rust core checks them.
// Sizes of the interface, in percent, by name.
export const INTERFACE_SCALES = {
	'80%': 80,
	'90%': 90,
	'100%': 100,
	'110%': 110,
	'125%': 125,
	'150%': 150,
};
export const FONT_SIZE = { min: 10, max: 32 };
export const READING_WIDTH = { min: 40, max: 200 };
// Line heights of the reading view, in percent of the text size.
export const LINE_SPACINGS = {
	tight: 130,
	compact: 145,
	normal: 160,
	relaxed: 180,
	loose: 200,
};
export const INDENT_WIDTH = { min: 1, max: 8 };

// Replaces the preferences; resolves to the settings of the device.
export async function setPreferences(
	preferences: Preferences,
): Promise<DeviceSettings> {
	return invoke<DeviceSettings>('set_preferences', { preferences });
}

// Changes of the preferences run one after the other, each on top of the
// preferences the core saved last: a quick second change neither undoes
// the first nor gets undone by it.
let saved: Preferences | undefined;
let queue: Promise<unknown> = Promise.resolve();

// Changes some of the preferences of `settings`; resolves to the settings
// of the device.
export async function changePreferences(
	settings: DeviceSettings,
	change: Partial<Preferences>,
): Promise<DeviceSettings> {
	const next = queue.then(async () => {
		const base = saved ?? settings.preferences;
		const result = await setPreferences({ ...base, ...change });
		saved = result.preferences;
		return result;
	});
	queue = next.catch(() => undefined);
	return next;
}
