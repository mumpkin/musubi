// SPDX-License-Identifier: GPL-3.0-or-later
// Rules for branch names, see CONTRIBUTING.md#branches.

export const BRANCH_TYPES = [
	'feat',
	'fix',
	'docs',
	'refactor',
	'perf',
	'test',
	'ci',
	'chore',
] as const;

const ALLOWED_BRANCHES = new Set(['main']);
const AUTOMATED_BRANCH_PREFIX = 'dependabot/';
const TYPED_BRANCH = new RegExp(
	`^(${BRANCH_TYPES.join('|')})/[a-z0-9]+(-[a-z0-9]+)*$`,
	'u',
);

export function isValidBranchName(branchName: string): boolean {
	return (
		ALLOWED_BRANCHES.has(branchName)
		|| branchName.startsWith(AUTOMATED_BRANCH_PREFIX)
		|| TYPED_BRANCH.test(branchName)
	);
}
