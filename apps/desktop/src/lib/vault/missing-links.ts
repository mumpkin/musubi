// SPDX-License-Identifier: GPL-3.0-or-later
// Links to notes that do not exist: the note they most likely meant, a
// near miss in its name (spaces or `_`, case, accents), and pointing every
// link at it.
import { invoke } from '@tauri-apps/api/core';

const NOTE_EXTENSION = /\.typ$/u;
const MARKS = /\p{Mark}/gu;
const GAPS = /[\s_]+/gu;

// What two paths that differ only by a near miss have in common.
export function nearKey(path: string): string {
	return path
		.normalize('NFD')
		.replaceAll(MARKS, '')
		.toLowerCase()
		.replaceAll(GAPS, ' ')
		.trim();
}

// The note of `paths` that `path`, missing, most likely meant.
export function nearNote(
	path: string,
	paths: Iterable<string>,
): string | undefined {
	const key = nearKey(path);
	for (const candidate of paths) {
		if (candidate !== path && nearKey(candidate) === key) {
			return candidate;
		}
	}
	return undefined;
}

// Points every link to the note at `from` at the note at `to` (both with
// their extension).
export async function retargetLinks(from: string, to: string): Promise<void> {
	await invoke('retarget_links', {
		from: from.replace(NOTE_EXTENSION, ''),
		to: to.replace(NOTE_EXTENSION, ''),
	});
}
