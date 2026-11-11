// SPDX-License-Identifier: GPL-3.0-or-later
// Searching the vault: note titles (fuzzy, as Helix's file picker) and the
// full text of the notes (as Helix's global search).
import { invoke } from '@tauri-apps/api/core';

import type { NoteMatch } from '../bindings/NoteMatch.ts';
import type { TextMatch } from '../bindings/TextMatch.ts';

export type SearchKind = 'titles' | 'text';

// One result of a search, as the picker shows it.
export interface SearchResult {
	path: string;
	title: string;
	// Grey text after the title: the folder, or the excerpt.
	detail: ExcerptPart[];
	// Line (from 0) to open the note at.
	line?: number | undefined;
}

export interface ExcerptPart {
	text: string;
	isMatch: boolean;
}

// Marks put around the matched words by the Rust core.
const MATCH_START = '';
const MATCH_END = '';

// Splits an excerpt into plain and matched parts.
export function excerptParts(excerpt: string): ExcerptPart[] {
	const parts: ExcerptPart[] = [];
	for (const [index, chunk] of excerpt.split(MATCH_START).entries()) {
		const [matched, rest] = index === 0
			? ['', chunk]
			: [chunk.split(MATCH_END)[0] ?? '', chunk.split(MATCH_END)[1] ?? ''];
		if (matched !== '') {
			parts.push({ text: matched, isMatch: true });
		}
		if (rest !== '') {
			parts.push({ text: rest, isMatch: false });
		}
	}
	return parts;
}

async function searchTitles(query: string): Promise<SearchResult[]> {
	const found = await invoke<NoteMatch[]>('search_notes', { query });
	return found.map(({ path, title, folder }) => ({
		path,
		title,
		detail: folder ? [{ text: folder, isMatch: false }] : [],
	}));
}

async function searchText(text: string): Promise<SearchResult[]> {
	const found = await invoke<TextMatch[]>('search_text', { text });
	return found.map(({ path, title, line, excerpt }) => ({
		path,
		title,
		line,
		detail: excerptParts(excerpt),
	}));
}

export async function search(kind: SearchKind, query: string) {
	return kind === 'titles' ? searchTitles(query) : searchText(query);
}
