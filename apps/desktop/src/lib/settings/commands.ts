// SPDX-License-Identifier: GPL-3.0-or-later
// Calls to the settings commands of the Rust core.
import { invoke } from '@tauri-apps/api/core';

import type { DeviceSettings } from '../bindings/DeviceSettings.ts';

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
