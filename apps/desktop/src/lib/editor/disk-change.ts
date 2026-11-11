// SPDX-License-Identifier: GPL-3.0-or-later
// The smallest change from one text to another, around their common start
// and end: the cursor stays where it was outside the change.

export interface TextChange {
	from: number;
	to: number;
	insert: string;
}

export function diskChange(current: string, next: string): TextChange {
	const shortest = Math.min(current.length, next.length);
	let start = 0;
	while (start < shortest && current[start] === next[start]) {
		start += 1;
	}
	let end = 0;
	while (
		end < shortest - start
		&& current[current.length - 1 - end] === next[next.length - 1 - end]
	) {
		end += 1;
	}
	return {
		from: start,
		to: current.length - end,
		insert: next.slice(start, next.length - end),
	};
}
