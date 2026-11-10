// SPDX-License-Identifier: GPL-3.0-or-later
// Usage: check-commit-message.ts <message file> [--allow-autosquash]
import { readFileSync } from 'node:fs';

import { findCommitMessageErrors } from './commit-message.ts';

// `process.argv` starts with the Node binary and the script path
const FIRST_ARGUMENT_INDEX = 2;
const USAGE_ERROR_EXIT_CODE = 2;

const [messageFile, ...flags] = process.argv.slice(FIRST_ARGUMENT_INDEX);

if (!messageFile) {
	console.error('Usage: check-commit-message.ts <file> [--allow-autosquash]');
	process.exit(USAGE_ERROR_EXIT_CODE);
}

const message = readFileSync(messageFile, 'utf8');
const errors = findCommitMessageErrors(message, {
	allowAutosquash: flags.includes('--allow-autosquash'),
});

if (errors.length > 0) {
	console.error(`Invalid commit message: "${message.split('\n')[0] ?? ''}"`);
	for (const error of errors) {
		console.error(`  - ${error}`);
	}
	console.error('See CONTRIBUTING.md#commit-messages');
	process.exit(1);
}
