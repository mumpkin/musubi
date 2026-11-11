// SPDX-License-Identifier: GPL-3.0-or-later
// Turns the HTML document exported by Typst into markup for the reading
// view. Notes are files from anywhere (synced, downloaded), and Typst lets a
// note emit any element with `html.elem`: everything that could run code is
// removed. The content security policy of the window is a second barrier.

export interface NoteMarkup {
	body: string;
	styles: string;
}

const FORBIDDEN_ELEMENTS = [
	'script',
	'iframe',
	'frame',
	'object',
	'embed',
	'link',
	'meta',
	'base',
	'form',
];
const URL_ATTRIBUTES = new Set(['href', 'src', 'action', 'formaction']);
const SAFE_URL = /^(?:musubi:|https?:|mailto:|#|data:image\/)/iu;

function isDangerousAttribute(attribute: Attr): boolean {
	const name = attribute.name.toLowerCase();
	if (name.startsWith('on')) {
		return true;
	}
	return URL_ATTRIBUTES.has(name) && !SAFE_URL.test(attribute.value.trim());
}

function sanitize(root: Element): void {
	for (const element of root.querySelectorAll(FORBIDDEN_ELEMENTS.join())) {
		element.remove();
	}
	for (const element of root.querySelectorAll('*')) {
		for (const attribute of [...element.attributes]) {
			if (isDangerousAttribute(attribute)) {
				element.removeAttribute(attribute.name);
			}
		}
	}
}

// Class of the links to notes that do not exist yet.
export const MISSING_LINK_CLASS = 'missing';

// Marks the note links whose note `exists` does not know.
function markMissingLinks(
	root: Element,
	exists: (path: string) => boolean,
): void {
	for (const link of root.querySelectorAll<HTMLElement>('a.musubi-link')) {
		const path = linkedNotePath(link);
		if (path !== undefined && !exists(path)) {
			link.classList.add(MISSING_LINK_CLASS);
			link.title = 'This note does not exist yet: click to create it';
		}
	}
}

// Class of the links that leave Musubi for the system browser.
export const WEB_LINK_CLASS = 'web-link';
const WEB_URL = /^(?:https?|mailto):/iu;

// The address of a web link, or `undefined` for any other link.
export function webLinkUrl(element: Element): string | undefined {
	const href = element.closest('a')?.getAttribute('href')?.trim();
	return href !== undefined && WEB_URL.test(href) ? href : undefined;
}

// Marks web links, which show an external mark and their address on hover.
function markWebLinks(root: Element): void {
	for (const link of root.querySelectorAll<HTMLElement>('a[href]')) {
		const url = webLinkUrl(link);
		if (url !== undefined) {
			link.classList.add(WEB_LINK_CLASS);
			link.title = `${url} (opens in the browser)`;
		}
	}
}

// `exists` tells whether a note path (from the vault root, with the
// extension) is a note of the vault.
export function toNoteMarkup(
	html: string,
	exists: (path: string) => boolean = () => true,
): NoteMarkup {
	const document = new DOMParser().parseFromString(html, 'text/html');
	sanitize(document.documentElement);
	markMissingLinks(document.body, exists);
	markWebLinks(document.body);
	const styles = [...document.head.querySelectorAll('style')]
		.map((style) => style.textContent)
		.join('\n');
	return { body: document.body.innerHTML, styles };
}

// Path of the note a `note-link` points to, from the vault root.
export function linkedNotePath(element: Element): string | undefined {
	const link = element.closest<HTMLElement>('a.musubi-link');
	const target = link?.dataset.target;
	return target === undefined ? undefined : `${target}.typ`;
}
