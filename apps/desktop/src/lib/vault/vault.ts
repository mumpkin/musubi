// SPDX-License-Identifier: GPL-3.0-or-later
// Calls to the vault commands of the Rust core.
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

import type { DeviceSettings } from '../bindings/DeviceSettings.ts';
import type { VaultInfo } from '../bindings/VaultInfo.ts';
import type { VaultTree } from '../bindings/VaultTree.ts';

export async function currentVault(): Promise<VaultInfo | null> {
	return invoke<VaultInfo | null>('current_vault');
}

export async function openVault(root: string): Promise<VaultInfo> {
	return invoke<VaultInfo>('open_vault', { root });
}

export async function vaultTree(): Promise<VaultTree> {
	return invoke<VaultTree>('vault_tree');
}

export async function readNote(path: string): Promise<string> {
	return invoke<string>('read_note', { path });
}

export async function writeNote(path: string, content: string) {
	await invoke('write_note', { path, content });
}

export async function deviceSettings(): Promise<DeviceSettings> {
	return invoke<DeviceSettings>('device_settings');
}

export async function createNote(folder: string, title: string) {
	return invoke<string>('create_note', { folder, title });
}

export async function createFolder(parent: string, name: string) {
	return invoke<string>('create_folder', { parent, name });
}

export async function demoVaultPath(): Promise<string | null> {
	return invoke<string | null>('demo_vault_path');
}

// Asks the user for a folder; `null` if cancelled.
export async function pickFolder(): Promise<string | null> {
	const folder = await open({ directory: true, title: 'Choose a vault' });
	return typeof folder === 'string' ? folder : null;
}

export interface NewEntry {
	kind: 'note' | 'folder';
	folder: string;
	name: string;
}

// Creates a note or a folder; returns the new tree and the note's path.
export async function createEntry({ kind, folder, name }: NewEntry) {
	const note = kind === 'note'
		? await createNote(folder, name)
		: (await createFolder(folder, name), undefined);
	return { tree: await vaultTree(), note };
}
