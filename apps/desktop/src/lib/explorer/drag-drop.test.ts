// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import { canMoveInto } from './drag-drop.ts';

describe('canMoveInto', () => {
	it('moves a note into another folder, not its own', () => {
		const note = { path: 'Maths/A.typ', kind: 'note' as const };
		expect(canMoveInto(note, 'Philo')).toBe(true);
		expect(canMoveInto(note, '')).toBe(true);
		expect(canMoveInto(note, 'Maths')).toBe(false);
	});

	it('never moves a folder into itself', () => {
		const folder = { path: 'Maths', kind: 'folder' as const };
		expect(canMoveInto(folder, 'Maths')).toBe(false);
		expect(canMoveInto(folder, 'Maths/Algebra')).toBe(false);
		expect(canMoveInto(folder, 'Mathematics')).toBe(true);
		expect(canMoveInto(folder, '')).toBe(false);
	});
});
