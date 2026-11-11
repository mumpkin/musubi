// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import { editorModes, modeIndicator } from './index.ts';

describe('modeIndicator', () => {
	it('names every mode in full, in capitals', () => {
		for (const mode of editorModes) {
			expect(modeIndicator(mode)).toBe(mode.toUpperCase());
		}
	});

	it('shows NORMAL in normal mode', () => {
		expect(modeIndicator('normal')).toBe('NORMAL');
	});
});
