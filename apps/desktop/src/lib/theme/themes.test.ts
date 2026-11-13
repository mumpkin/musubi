// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import { cssVariables, DEFAULT_THEMES, UI_COLORS } from './themes.ts';

describe('cssVariables', () => {
	it('takes missing colors from the default theme of the scheme', () => {
		const variables = cssVariables({
			name: 'Partial',
			colorScheme: 'dark',
			ui: { accent: '#ff0000' },
			syntax: {},
		});
		expect(variables.get('--accent')).toBe('#ff0000');
		expect(variables.get('--background')).toBe('#1f2430');
		expect(variables.get('--syntax-keyword')).toBe('#ffa659');
	});

	it('finds every color in the default themes', () => {
		for (const { theme } of DEFAULT_THEMES) {
			for (const name of UI_COLORS) {
				expect(theme.ui[name], `${theme.name} ${name}`).toBeDefined();
			}
			expect(Object.keys(theme.syntax)).toHaveLength(9);
		}
	});
});
