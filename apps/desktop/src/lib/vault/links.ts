// SPDX-License-Identifier: GPL-3.0-or-later
// Links between notes: backlinks from the index of the Rust core, and
// links to notes that do not exist yet.
import type { LinkSource, LinkSuggestion } from '@musubi/editor';
import { invoke } from '@tauri-apps/api/core';

import type { Backlink } from '../bindings/Backlink.ts';
import type { NoteMatch } from '../bindings/NoteMatch.ts';

export async function backlinks(path: string): Promise<Backlink[]> {
	return invoke<Backlink[]>('backlinks', { path });
}

// Creates the missing note at `path` (with its extension), the target of a
// link, titled `title`.
export async function createLinkedNote(path: string, title: string) {
	return invoke<undefined>('create_linked_note', { path, title });
}

// Backlinks of one linking note.
export interface BacklinkGroup {
	path: string;
	title: string;
	// Links in the same sentence show once, with the sections they target.
	links: { sections: string[]; context: string }[];
}

// Groups the backlinks by linking note, keeping their order.
export function groupBacklinks(links: Backlink[]): BacklinkGroup[] {
	const groups: BacklinkGroup[] = [];
	for (const { path, title, section, context } of links) {
		let group = groups.at(-1);
		if (group?.path !== path) {
			group = { path, title, links: [] };
			groups.push(group);
		}
		let sentence = group.links.at(-1);
		if (sentence?.context !== context) {
			sentence = { sections: [], context };
			group.links.push(sentence);
		}
		if (section !== null) {
			sentence.sections.push(section);
		}
	}
	return groups;
}

// Title of a note created from a link: the link text, or the target's file
// name with `_` read as spaces.
export function linkedNoteTitle(path: string, text: string): string {
	const trimmed = text.trim().replaceAll(/\s+/gu, ' ');
	if (trimmed !== '') {
		return trimmed;
	}
	const stem = path.slice(path.lastIndexOf('/') + 1).replace(/\.typ$/u, '');
	return stem.replaceAll('_', ' ');
}

// Notes for a link typed with `[[`, best match first.
export async function searchLinks(query: string): Promise<LinkSuggestion[]> {
	const found = await invoke<NoteMatch[]>('search_notes', { query });
	return found.map(({ path, title, folder }) => ({
		target: path.replace(/\.typ$/u, ''),
		title,
		folder,
	}));
}

// Links typed with `[[`: notes by title, then headings after `#`.
export const linkSource: LinkSource = {
	notes: searchLinks,
	sections: async (target, query) => invoke<string[]>(
		'search_sections',
		{ path: `${target}.typ`, query },
	),
};
