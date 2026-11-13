// SPDX-License-Identifier: GPL-3.0-or-later
// The lines of two versions of a note, side by side: lines both share,
// and lines only one of them has, from their longest common sequence.

export interface DiffLine {
	// `same` in both versions, `mine` only in the note, `theirs` only in
	// the copy.
	kind: 'same' | 'mine' | 'theirs';
	text: string;
}

// Lengths of the longest common sequences of the tails of `left` and
// `right`: `table[row][column]` for `left.slice(row)` and
// `right.slice(column)`.
function commonLengths(left: string[], right: string[]): number[][] {
	const table = Array.from(
		{ length: left.length + 1 },
		() => Array.from<number>({ length: right.length + 1 }).fill(0),
	);
	for (let row = left.length - 1; row >= 0; row -= 1) {
		const line = table[row];
		for (let column = right.length - 1; column >= 0; column -= 1) {
			if (line) {
				line[column] = left[row] === right[column]
					? (table[row + 1]?.[column + 1] ?? 0) + 1
					: Math.max(
							table[row + 1]?.[column] ?? 0,
							line[column + 1] ?? 0,
						);
			}
		}
	}
	return table;
}

interface Walk {
	left: string[];
	right: string[];
	table: number[][];
	row: number;
	column: number;
}

// The next line of the diff, from the position of `walk`, which moves on.
function step(walk: Walk): DiffLine {
	const { left, right, row, column } = walk;
	const mine = left[row];
	const theirs = right[column];
	if (mine !== undefined && mine === theirs) {
		walk.row += 1;
		walk.column += 1;
		return { kind: 'same', text: mine };
	}
	if (mine !== undefined && takesMine(walk)) {
		walk.row += 1;
		return { kind: 'mine', text: mine };
	}
	walk.column += 1;
	return { kind: 'theirs', text: theirs ?? '' };
}

// Whether the line of the note goes first: the copy has no line left, or
// skipping the note line keeps the longest common sequence.
function takesMine({ right, table, row, column }: Walk): boolean {
	if (column >= right.length) {
		return true;
	}
	const below = table[row + 1]?.[column] ?? -1;
	const beside = table[row]?.[column + 1] ?? -1;
	return below >= beside;
}

export function lineDiff(mine: string, theirs: string): DiffLine[] {
	const left = mine.split('\n');
	const right = theirs.split('\n');
	const walk: Walk = {
		left,
		right,
		table: commonLengths(left, right),
		row: 0,
		column: 0,
	};
	const lines: DiffLine[] = [];
	while (walk.row < left.length || walk.column < right.length) {
		lines.push(step(walk));
	}
	return lines;
}

// The sync tool that made the conflict copy `copy`, from its name.
export function toolOf(copy: string): string {
	if (copy.includes('.sync-conflict-')) {
		return 'Syncthing';
	}
	return copy.includes('\'s conflicted copy') ? 'Dropbox' : 'Nextcloud';
}
