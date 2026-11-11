// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import { groupBacklinks, linkedNoteTitle } from './links.ts';

function link(path: string, context: string, section: string | null = null) {
	return { path, title: path, section, context };
}

describe('groupBacklinks', () => {
	it('groups the links of each note, in order', () => {
		const groups = groupBacklinks([
			link('A.typ', 'one'),
			link('A.typ', 'two'),
			link('B.typ', 'three'),
		]);
		expect(groups.map((group) => group.links.length)).toEqual([2, 1]);
		expect(groups[0]?.links[1]?.context).toBe('two');
	});

	it('shows a sentence with several links once', () => {
		const groups = groupBacklinks([
			link('A.typ', 'same'),
			link('A.typ', 'same', 'Part'),
		]);
		expect(groups[0]?.links).toEqual([
			{ sections: ['Part'], context: 'same' },
		]);
	});
});

describe('linkedNoteTitle', () => {
	it('takes the link text, or else the file name', () => {
		expect(linkedNoteTitle('Maths/Algebre.typ', ' Algèbre\n linéaire '))
			.toBe('Algèbre linéaire');
		expect(linkedNoteTitle('Maths/Missing_note.typ', '')).toBe(
			'Missing note',
		);
	});
});
