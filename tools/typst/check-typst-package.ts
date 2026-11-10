// SPDX-License-Identifier: GPL-3.0-or-later
// Compiles every test note of the `musubi` Typst package to PDF and HTML,
// then checks that querying it returns the expected links, cards and tasks.
// Needs the Typst command-line tool, see CONTRIBUTING.md.
import { execFileSync } from 'node:child_process';
import {
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

const PACKAGE_DIRECTORY = resolve(import.meta.dirname, '../../typst/musubi');
const TESTS_DIRECTORY = join(PACKAGE_DIRECTORY, 'tests');
const LABELS = ['musubi-link', 'musubi-card', 'musubi-task'] as const;

type Expected = Record<(typeof LABELS)[number], unknown[]>;

function packageVersion(): string {
	const manifest = readFileSync(join(PACKAGE_DIRECTORY, 'typst.toml'), 'utf8');
	const version = /^version = "(?<version>[^"]+)"$/mu.exec(manifest)?.groups
		?.version;
	if (version === undefined) {
		throw new Error('No version in typst/musubi/typst.toml');
	}
	return version;
}

// Typst resolves `@local/musubi:<version>` from
// `<package path>/local/musubi/<version>`: link the package there.
function createPackagePath(): string {
	const packagePath = mkdtempSync(join(tmpdir(), 'musubi-typst-'));
	const namespaceDirectory = join(packagePath, 'local', 'musubi');
	mkdirSync(namespaceDirectory, { recursive: true });
	symlinkSync(PACKAGE_DIRECTORY, join(namespaceDirectory, packageVersion()));
	return packagePath;
}

function typst(packagePath: string, typstArguments: string[]): string {
	return execFileSync(
		'typst',
		[...typstArguments, '--package-path', packagePath],
		{
			cwd: TESTS_DIRECTORY,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe'],
		},
	);
}

function compile(packagePath: string, note: string): void {
	const output = join(packagePath, note);
	typst(packagePath, ['compile', note, `${output}.pdf`]);
	typst(packagePath, [
		'compile',
		'--features',
		'html',
		'--format',
		'html',
		note,
		`${output}.html`,
	]);
}

function query(packagePath: string, note: string, label: string): unknown {
	const expression = `query(<${label}>).map(element => element.value)`;
	const output = typst(packagePath, ['eval', expression, '--in', note]);
	return JSON.parse(output);
}

function checkNote(packagePath: string, note: string): boolean {
	compile(packagePath, note);
	const expectedFile = note.replace(/\.typ$/u, '.expected.json');
	const expected = JSON.parse(
		readFileSync(join(TESTS_DIRECTORY, expectedFile), 'utf8'),
	) as Expected;
	let passed = true;
	for (const label of LABELS) {
		const actual = query(packagePath, note, label);
		if (!isDeepStrictEqual(actual, expected[label])) {
			console.error(`${note}: unexpected <${label}>`);
			console.error(`  expected ${JSON.stringify(expected[label])}`);
			console.error(`  actual   ${JSON.stringify(actual)}`);
			passed = false;
		}
	}
	return passed;
}

const packagePath = createPackagePath();
const notes = readdirSync(TESTS_DIRECTORY)
	.filter((file) => file.endsWith('.typ'))
	.sort();
const failures = notes.filter((note) => !checkNote(packagePath, note));

const passedCount = notes.length - failures.length;
console.log(
	`${String(passedCount)}/${String(notes.length)} test notes passed`,
);
if (failures.length > 0) {
	process.exit(1);
}
