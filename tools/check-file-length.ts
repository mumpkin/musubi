// SPDX-License-Identifier: GPL-3.0-or-later
// Fails when a Rust file tracked by git exceeds the line limit.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { isTooLong, MAX_LINES_PER_FILE } from './file-length.ts';

const trackedRustFiles = execFileSync('git', ['ls-files', '*.rs'], {
	encoding: 'utf8',
})
	.split('\n')
	.filter((path) => path !== '');

const tooLong = trackedRustFiles.filter((path) =>
	isTooLong(readFileSync(path, 'utf8')),
);

if (tooLong.length > 0) {
	console.error(`Files over ${String(MAX_LINES_PER_FILE)} non-blank lines:`);
	for (const path of tooLong) {
		console.error(`  - ${path}`);
	}
	process.exit(1);
}
