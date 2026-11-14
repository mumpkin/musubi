// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import {
	linkedNotePath,
	taskOffset,
	toNoteMarkup,
	webLinkUrl,
} from './note-html.ts';

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

	it('gives code colors of the Typst palette to the theme', () => {
		const code = '<code><span style="color: #d73948">fn</span> '
			+ '<span style="color: #123456">x</span></code>';
		const markup = toNoteMarkup(page('', `<pre>${code}</pre>`));
		expect(markup.body).toBe(
			'<pre><code><span class="syntax-keyword">fn</span> '
			+ '<span style="color: #123456">x</span></code></pre>',
		);
	});

	it('gives fraction bars a visible thickness', () => {
		const fraction = '<mfrac><mi>a</mi><mi>b</mi></mfrac>';
		const binomial = '<mfrac linethickness="0"><mi>n</mi><mi>k</mi></mfrac>';
		const markup = toNoteMarkup(
			page('', `<math>${fraction}${binomial}</math>`),
		);
		expect(markup.body).toContain('<mfrac linethickness="1px">');
		expect(markup.body).toContain('<mfrac linethickness="0">');
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
			+ '<a href="https://typst.app" class="web-link" '
			+ 'title="https://typst.app (opens in the browser)">z</a>',
		);
	});
});

describe('missing links', () => {
	it('marks the links to notes that do not exist', () => {
		const markup = toNoteMarkup(
			page(
				'',
				'<a class="musubi-link" data-target="Here">a</a>'
				+ '<a class="musubi-link" data-target="Gone">b</a>',
			),
			(path) => path === 'Here.typ',
		);
		const container = document.createElement('div');
		container.innerHTML = markup.body;
		const missing = [...container.querySelectorAll('a.missing')]
			.map((link) => link.textContent);
		expect(missing).toEqual(['b']);
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

describe('web links', () => {
	it('marks the links that leave Musubi, with their address', () => {
		const markup = toNoteMarkup(page('', [
			'<a href="https://typst.app">Typst</a>',
			'<a href="mailto:me@example.org">mail</a>',
			'<a href="#intro">here</a>',
			'<a class="musubi-link" href="musubi:x" data-target="x">x</a>',
		].join('')));
		const body = new DOMParser().parseFromString(markup.body, 'text/html');
		const marked = [...body.querySelectorAll('a.web-link')];
		expect(marked.map((link) => link.textContent)).toEqual(['Typst', 'mail']);
		expect(marked[0]?.getAttribute('title')).toBe(
			'https://typst.app (opens in the browser)',
		);
	});

	it('gives the address of a web link only', () => {
		const body = new DOMParser().parseFromString(
			'<a href=" HTTPS://typst.app "><b>T</b></a><a href="#x">x</a>',
			'text/html',
		).body;
		const [web, anchor] = body.querySelectorAll('a');
		expect(webLinkUrl(web?.querySelector('b') ?? body)).toBe(
			'HTTPS://typst.app',
		);
		expect(webLinkUrl(anchor ?? body)).toBeUndefined();
	});
});

describe('tasks', () => {
	const task = (attributes: string): string =>
		`<span class="musubi-task"${attributes}>`
		+ '<input type="checkbox" disabled="">Buy milk</span>';

	it('lets the tasks the core found be switched', () => {
		const markup = toNoteMarkup(
			page('', task(' data-task="12"') + task('')),
		);
		const root = document.createElement('div');
		root.innerHTML = markup.body;
		const [found, other] = root.querySelectorAll('input');
		expect(found?.disabled).toBe(false);
		expect(other?.disabled).toBe(true);
		expect(found && taskOffset(found)).toBe(12);
		expect(other && taskOffset(other)).toBeUndefined();
	});
});
