// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import { linkedNotePath, toNoteMarkup } from './note-html.ts';

function page(head: string, body: string): string {
	return `<!DOCTYPE html><html><head>${head}</head><body>${body}</body></html>`;
}

describe('toNoteMarkup', () => {
	it('keeps the body and the styles of the head', () => {
		const markup = toNoteMarkup(
			page('<style>math { color: red }</style>', '<h2>Title</h2>'),
		);
		expect(markup.body).toBe('<h2>Title</h2>');
		expect(markup.styles).toBe('math { color: red }');
	});

	it('removes scripts and embedded documents', () => {
		const markup = toNoteMarkup(
			page('', '<p>a</p><script>alert(1)</script><object data="x"></object>'),
		);
		expect(markup.body).toBe('<p>a</p>');
	});

	it('removes event handlers', () => {
		const markup = toNoteMarkup(page('', '<p onclick="alert(1)">a</p>'));
		expect(markup.body).toBe('<p>a</p>');
	});

	it('removes javascript URLs but keeps note and web links', () => {
		const markup = toNoteMarkup(
			page(
				'',
				'<a href="javascript:alert(1)">x</a>'
				+ '<a href="musubi://note/Demo">y</a>'
				+ '<a href="https://typst.app">z</a>',
			),
		);
		expect(markup.body).toBe(
			'<a>x</a><a href="musubi://note/Demo">y</a>'
			+ '<a href="https://typst.app">z</a>',
		);
	});
});

describe('linkedNotePath', () => {
	it('returns the path of the linked note', () => {
		const markup = toNoteMarkup(
			page(
				'',
				'<a class="musubi-link" data-target="Maths/Analyse">'
				+ '<strong>Analyse</strong></a>',
			),
		);
		const container = document.createElement('div');
		container.innerHTML = markup.body;
		const strong = container.querySelector('strong');
		expect(strong && linkedNotePath(strong)).toBe('Maths/Analyse.typ');
	});

	it('ignores elements outside note links', () => {
		const paragraph = document.createElement('p');
		expect(linkedNotePath(paragraph)).toBeUndefined();
	});
});
