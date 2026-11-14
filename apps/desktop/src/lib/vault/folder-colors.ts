// SPDX-License-Identifier: GPL-3.0-or-later
// A color for each folder of the vault, chosen from its path: the same
// folder keeps its color from one session to the next, without settings,
// and folders get different colors as long as the palette lasts. The
// graph colors its notes with it; the explorer shows it next to the folder
// while a graph is on screen.

const FNV_OFFSET = 0x81_1c_9d_c5;
const FNV_PRIME = 0x01_00_01_93;

// Ten hues far enough apart to tell, at a lightness and saturation that
// read on light and dark themes. Next to each other in the list, hues are
// far apart on the color wheel: a folder whose hue is taken gets a very
// different one.
const HUES = [
	'210',
	'30',
	'140',
	'320',
	'95',
	'250',
	'0',
	'175',
	'55',
	'280',
] as const;
const SATURATION = '55%';
const LIGHTNESS = '55%';

// FNV-1a hash of `text`, as an unsigned 32-bit number.
function hash(text: string): number {
	let value = FNV_OFFSET;
	for (const character of text) {
		value ^= character.codePointAt(0) ?? 0;
		value = Math.imul(value, FNV_PRIME);
	}
	return value >>> 0;
}

function color(hue: string): string {
	return `hsl(${hue} ${SATURATION} ${LIGHTNESS})`;
}

// The hue a folder takes when it is free.
function preferredHue(folder: string): number {
	return hash(folder) % HUES.length;
}

// The color of every folder of `folders` (paths from the vault root). Each
// takes the hue of its path, or the next one still free, in the order of
// the paths: adding a folder rarely moves the others.
export function assignFolderColors(
	folders: readonly string[],
): Map<string, string> {
	const taken = new Set<number>();
	const colors = new Map<string, string>();
	for (const folder of [...folders].sort()) {
		let hue = preferredHue(folder);
		for (let step = 0; step < HUES.length && taken.has(hue); step += 1) {
			hue = (hue + 1) % HUES.length;
		}
		taken.add(hue);
		colors.set(folder, color(HUES[hue] ?? '0'));
	}
	return colors;
}

// The color of a folder missing from the assignment.
export function fallbackFolderColor(folder: string): string {
	return color(HUES[preferredHue(folder)] ?? '0');
}
