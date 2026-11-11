// SPDX-License-Identifier: GPL-3.0-or-later
// Images of a note, copied into its `.assets` folder by the Rust core.
import { invoke } from '@tauri-apps/api/core';

const IMAGE_TYPES = new Map([
	['image/png', 'png'],
	['image/jpeg', 'jpg'],
	['image/gif', 'gif'],
	['image/svg+xml', 'svg'],
	['image/webp', 'webp'],
]);

export function isImageFile(file: File): boolean {
	return IMAGE_TYPES.has(file.type);
}

const TWO_DIGITS = 2;

function twoDigits(value: number): string {
	return String(value).padStart(TWO_DIGITS, '0');
}

// `image_<YYYYMMDD>_<HHMMSS>.<ext>` in local time, for pasted data.
export function pastedImageName(type: string, date: Date): string {
	const day = `${String(date.getFullYear())}${twoDigits(date.getMonth() + 1)}`
		+ twoDigits(date.getDate());
	const time = twoDigits(date.getHours()) + twoDigits(date.getMinutes())
		+ twoDigits(date.getSeconds());
	return `image_${day}_${time}.${IMAGE_TYPES.get(type) ?? 'png'}`;
}

// The name a pasted file had, or a generated one: the clipboard names
// screenshots `image.png` or nothing at all.
function nameOf(file: File): string {
	const isGeneric = file.name === '' || /^image\.\w+$/u.test(file.name);
	return isGeneric ? pastedImageName(file.type, new Date()) : file.name;
}

// Copies a pasted image into `note`; resolves to the path to write in it.
export async function pasteImage(note: string, file: File): Promise<string> {
	const bytes = new Uint8Array(await file.arrayBuffer());
	return invoke<string>('paste_image', bytes, {
		headers: {
			note: encodeURIComponent(note),
			name: encodeURIComponent(nameOf(file)),
		},
	});
}

// Copies the image at `source` (dropped on the window) into `note`.
export async function importImage(note: string, source: string) {
	return invoke<string>('import_image', { note, source });
}

// Files of the `.assets` folder of `note`, relative to the note.
export async function noteAssets(note: string): Promise<string[]> {
	return invoke<string[]>('note_assets', { note });
}

// The Typst call that shows the image at `path`.
export function imageMarkup(path: string): string {
	return `#image("${path.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}")`;
}
