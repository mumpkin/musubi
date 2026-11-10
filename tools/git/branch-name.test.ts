// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import { isValidBranchName } from './branch-name.ts';

describe('isValidBranchName', () => {
	it.each([
		'main',
		'feat/reading-view',
		'docs/vault-format',
		'chore/monorepo-setup',
		'dependabot/npm_and_yarn/vite-8.4.0',
	])('accepts %s', (branchName) => {
		expect(isValidBranchName(branchName)).toBe(true);
	});

	it.each([
		'reading-view',
		'feature/reading-view',
		'feat/Reading-View',
		'feat/reading_view',
		'feat/',
		'fix/trailing-',
	])('rejects %s', (branchName) => {
		expect(isValidBranchName(branchName)).toBe(false);
	});
});
