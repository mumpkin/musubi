// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import { editorModes, modeIndicator } from './index.ts';

describe('modeIndicator', () => {
	it('gives a three-letter indicator to every mode', () => {
		for (const mode of editorModes) {
			expect(modeIndicator(mode)).toMatch(/^[A-Z]{3}$/u);
		}
	});

	it('shows NOR in normal mode', () => {
		expect(modeIndicator('normal')).toBe('NOR');
	});
});
