// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import { findCommitMessageErrors } from './commit-message.ts';

const STRICT = { allowAutosquash: false };
const LOCAL = { allowAutosquash: true };

describe('findCommitMessageErrors', () => {
	it.each([
		'Add `note-link` to the Typst package',
		'Handle accents in file names',
		'Configure `eslint.config.js` with tab indentation\n\nWith a body.',
	])('accepts "%s"', (message) => {
		expect(findCommitMessageErrors(message, STRICT)).toEqual([]);
	});

	it.each([
		['feat: add the renderer', 'type prefix'],
		['fix(core): handle accents', 'type prefix'],
		['add the renderer', 'capital letter'],
		['Add the renderer.', 'punctuation'],
		['Added the renderer', 'imperative mood'],
		['Merge branch main', 'imperative mood'],
		[`Add ${'a very long subject '.repeat(4)}`, 'characters'],
		['', 'empty'],
		['fixup! Add the renderer', 'Squash'],
	])('rejects "%s" (%s)', (message, expectedError) => {
		const errors = findCommitMessageErrors(message, STRICT);
		expect(errors.join(' ')).toContain(expectedError);
	});

	it('lets autosquash commits through locally', () => {
		const errors = findCommitMessageErrors('fixup! Add the renderer', LOCAL);
		expect(errors).toEqual([]);
	});
});
