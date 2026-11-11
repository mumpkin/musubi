// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import { excerptParts } from './search.ts';

describe('excerptParts', () => {
	it('splits the matched words from the rest', () => {
		expect(excerptParts('the Intégrales of f'))
			.toEqual([
				{ text: 'the ', isMatch: false },
				{ text: 'Intégrales', isMatch: true },
				{ text: ' of ', isMatch: false },
				{ text: 'f', isMatch: true },
			]);
		expect(excerptParts('plain')).toEqual([{ text: 'plain', isMatch: false }]);
	});
});
