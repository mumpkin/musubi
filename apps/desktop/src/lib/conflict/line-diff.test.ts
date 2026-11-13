// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import { lineDiff } from './line-diff.ts';

describe('lineDiff', () => {
	it('keeps the shared lines and marks the others', () => {
		expect(lineDiff('= A\nMine\nEnd', '= A\nTheirs\nEnd')).toEqual([
			{ kind: 'same', text: '= A' },
			{ kind: 'mine', text: 'Mine' },
			{ kind: 'theirs', text: 'Theirs' },
			{ kind: 'same', text: 'End' },
		]);
	});

	it('handles a line added at the end', () => {
		expect(lineDiff('a', 'a\nb').map((line) => line.kind)).toEqual([
			'same',
			'theirs',
		]);
	});
});
