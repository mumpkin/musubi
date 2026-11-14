// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import { assignFolderColors } from './folder-colors.ts';

const folders = [
	'Maths',
	'Maths/Algebra',
	'Philo',
	'Welcome',
	'Welcome/Advanced Examples',
];

describe('assignFolderColors', () => {
	it('gives every folder its own color', () => {
		const colors = assignFolderColors(folders);
		expect(new Set(colors.values()).size).toBe(folders.length);
	});

	it('gives a folder the same color whatever the order', () => {
		const colors = assignFolderColors(folders);
		const again = assignFolderColors([...folders].reverse());
		expect(again).toEqual(colors);
	});

	it('mostly keeps the colors when a folder is added', () => {
		const before = assignFolderColors(folders);
		const after = assignFolderColors([...folders, 'Zoology']);
		for (const folder of folders) {
			expect(after.get(folder)).toBe(before.get(folder));
		}
	});
});
