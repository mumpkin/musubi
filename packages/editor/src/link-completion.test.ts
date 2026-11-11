// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import { importChange, linkMarkup } from './link-completion.ts';

describe('linkMarkup', () => {
	it('writes a note link, with the markup of the title escaped', () => {
		expect(linkMarkup({ target: 'Maths/Analyse', title: 'Analyse' }))
			.toBe('#note-link("Maths/Analyse")[Analyse]');
		expect(linkMarkup({ target: 'C', title: 'C++ #1 [draft]' }))
			.toBe('#note-link("C")[C++ \\#1 \\[draft\\]]');
		expect(linkMarkup({ target: 'Say "hi"', title: '- list' }))
			.toBe('#note-link("Say \\"hi\\"")[\\- list]');
	});

	it('targets a section, named in the link text', () => {
		const link = { target: 'Maths/Analyse', title: 'Analyse' };
		expect(linkMarkup({ ...link, section: 'Intégrales' })).toBe(
			'#note-link("Maths/Analyse", section: "Intégrales")[Intégrales]',
		);
	});
});

describe('importChange', () => {
	it('imports the package when the note does not', () => {
		expect(importChange('= Note\n')).toEqual({
			from: 0,
			insert: '#import "@local/musubi:0.1.0": note-link\n',
		});
	});

	it('adds `note-link` to an existing import', () => {
		const text = '#import "@local/musubi:0.1.0": card\n= Note';
		expect(importChange(text)).toEqual({
			from: text.indexOf('\n'),
			insert: ', note-link',
		});
	});

	it('keeps an import that already has it', () => {
		expect(importChange('#import "@local/musubi:0.1.0": note-link'))
			.toBeUndefined();
		expect(importChange('#import "@local/musubi:0.1.0": *'))
			.toBeUndefined();
	});
});
