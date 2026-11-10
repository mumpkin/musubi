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

export function toNoteMarkup(html: string): NoteMarkup {
	const document = new DOMParser().parseFromString(html, 'text/html');
	sanitize(document.documentElement);
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
