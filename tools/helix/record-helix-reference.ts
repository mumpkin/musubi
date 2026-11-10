// SPDX-License-Identifier: GPL-3.0-or-later
// Records how the real Helix behaves on the cases of `helix-cases.ts`, into
// `packages/editor/src/helix-reference.json`. The editor tests compare the
// Musubi editor with this reference.
//
// Usage: node tools/helix/record-helix-reference.ts (needs `helix` and the
// `script` command of util-linux). Takes a few minutes.
import { spawn } from 'node:child_process';
import {
	existsSync,
	mkdtempSync,
	readFileSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { HELIX_CASES, type HelixCase } from './helix-cases.ts';

const OUTPUT = resolve(
	import.meta.dirname,
	'../../packages/editor/src/helix-reference.json',
);
const STARTUP_MILLISECONDS = 800;
const KEY_MILLISECONDS = 40;
const COMMAND_MILLISECONDS = 250;

// Typed commands that write markers around what Helix selected.
const MARKERS = {
	start: ':insert-output printf \'[\'\r',
	end: ':append-output printf \']\'\r',
	cursor: ';:insert-output printf \'|\'\r',
	none: '',
};

type MarkerKind = keyof typeof MARKERS;

async function pause(milliseconds: number): Promise<void> {
	await new Promise((resolveTimer) => {
		setTimeout(resolveTimer, milliseconds);
	});
}

async function replay(
	helixCase: HelixCase,
	marker: MarkerKind,
): Promise<string> {
	const directory = mkdtempSync(join(tmpdir(), 'musubi-helix-'));
	const file = join(directory, 'note.txt');
	const config = join(directory, 'config.toml');
	writeFileSync(file, helixCase.text);
	// Helix would add a final line break when saving, hiding the markers
	// placed at the end of the text.
	writeFileSync(config, '[editor]\ninsert-final-newline = false\n');
	const command = `stty cols 120 rows 40; helix -c '${config}' '${file}'`;
	const helix = spawn('script', ['-q', '-c', command, '/dev/null'], {
		stdio: ['pipe', 'ignore', 'ignore'],
	});
	const exited = new Promise((resolveExit) => {
		helix.on('exit', resolveExit);
	});
	await pause(STARTUP_MILLISECONDS);
	for (const key of helixCase.keys) {
		helix.stdin.write(key);
		await pause(KEY_MILLISECONDS);
	}
	for (const part of [MARKERS[marker], ':wq!\r']) {
		helix.stdin.write(part);
		await pause(COMMAND_MILLISECONDS);
	}
	await exited;
	return readFileSync(file, 'utf8');
}

// Cases already recorded are kept: only new cases run in Helix. Delete the
// reference file to record everything again.
const recorded = (
	existsSync(OUTPUT) ? JSON.parse(readFileSync(OUTPUT, 'utf8')) : []
) as { initialText: string; keys: string }[];

const reference: unknown[] = [];
for (const helixCase of HELIX_CASES) {
	const known = recorded.find((entry) =>
		entry.initialText === helixCase.text && entry.keys === helixCase.keys);
	if (known) {
		reference.push(known);
		continue;
	}
	const outcome = {
		initialText: helixCase.text,
		keys: helixCase.keys,
		text: await replay(helixCase, 'none'),
		starts: await replay(helixCase, 'start'),
		ends: await replay(helixCase, 'end'),
		cursors: await replay(helixCase, 'cursor'),
	};
	reference.push(outcome);
	console.log(JSON.stringify(outcome.keys), JSON.stringify(outcome.cursors));
}
writeFileSync(OUTPUT, `${JSON.stringify(reference, null, '\t')}\n`);
