// SPDX-License-Identifier: GPL-3.0-or-later
// Counts the non-blank lines of a file, to enforce the 300-line limit on
// files ESLint does not cover (Rust).

export const MAX_LINES_PER_FILE = 300;

export function countNonBlankLines(content: string): number {
	return content.split('\n').filter((line) => line.trim() !== '').length;
}

export function isTooLong(content: string): boolean {
	return countNonBlankLines(content) > MAX_LINES_PER_FILE;
}
