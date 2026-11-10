// SPDX-License-Identifier: GPL-3.0-or-later
// Usage: check-branch-name.ts [branch name], defaults to the current branch
import { execFileSync } from 'node:child_process';

import { BRANCH_TYPES, isValidBranchName } from './branch-name.ts';

// `process.argv` starts with the Node binary and the script path
const FIRST_ARGUMENT_INDEX = 2;

const branchName
	= process.argv[FIRST_ARGUMENT_INDEX]
		?? execFileSync('git', ['branch', '--show-current'], {
			encoding: 'utf8',
		}).trim();

if (!isValidBranchName(branchName)) {
	console.error(`Invalid branch name: "${branchName}"`);
	console.error('  Expected <type>/<kebab-case-topic> with a type among:');
	console.error(`  ${BRANCH_TYPES.join(', ')}`);
	console.error('See CONTRIBUTING.md#branches');
	process.exit(1);
}
