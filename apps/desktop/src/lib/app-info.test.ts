// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import { formatAppInfo } from './app-info.ts';

describe('formatAppInfo', () => {
	it('joins the name and the version', () => {
		expect(formatAppInfo({ name: 'Musubi', version: '0.0.0' })).toBe(
			'Musubi 0.0.0',
		);
	});
});
