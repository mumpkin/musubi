// SPDX-License-Identifier: GPL-3.0-or-later
// `[[` in insert mode: a fuzzy search over the notes, then a `note-link` to
// the chosen one, with the import of the `musubi` package if missing.
import {
	acceptCompletion,
	autocompletion,
	closeCompletion,
	type Completion,
	type CompletionContext,
	type CompletionResult,
	moveCompletionSelection,
} from '@codemirror/autocomplete';
import {
	EditorSelection,
	type EditorState,
	type Extension,
	Prec,
} from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';

import { insertOrigins, startInsert } from './insert.ts';
import { modeField } from './mode.ts';

export interface LinkSuggestion {
	// Path from the vault root, without the extension.
	target: string;
	title: string;
	// Folder, shown when several notes share the title.
	folder?: string | null | undefined;
	// Heading of the target, for `[[Note#Heading`.
	section?: string | undefined;
}

// Where links come from: notes by title, then the headings of a note.
export interface LinkSource {
	notes: (query: string) => Promise<LinkSuggestion[]>;
	sections: (target: string, query: string) => Promise<string[]>;
}

const LINK_START = /\[\[[^[\]\n]*$/u;
const IMPORT = /^#import "@local\/musubi:[^"]*"(?<names>[^\n]*)$/mu;
const IMPORT_LINE = '#import "@local/musubi:0.1.0": note-link\n';
const OPENING = '[[';
const CLOSING = ']]';
const SECTION_MARK = '#';

// Markup characters escaped in the link text.
function escapeMarkup(text: string): string {
	return text
		.replaceAll(/[\\[\]#*_$@<`~/]/gu, (character) => `\\${character}`)
		.replace(/^[-+=]/u, (character) => `\\${character}`);
}

function quoted(text: string): string {
	return `"${text.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

export function linkMarkup(link: LinkSuggestion): string {
	const { target, title, section } = link;
	return section === undefined
		? `#note-link(${quoted(target)})[${escapeMarkup(title)}]`
		: `#note-link(${quoted(target)}, section: ${quoted(section)})`
			+ `[${escapeMarkup(section)}]`;
}

// The change that imports `note-link`, if the note does not already.
export function importChange(text: string) {
	const found = IMPORT.exec(text);
	if (!found) {
		return { from: 0, insert: IMPORT_LINE };
	}
	const names = found.groups?.names ?? '';
	if (names.includes('note-link') || /:\s*\*/u.test(names)) {
		return undefined;
	}
	const end = found.index + found[0].length;
	return names.includes(':')
		? { from: end, insert: ', note-link' }
		: undefined;
}

function applyLink(
	view: EditorView,
	suggestion: LinkSuggestion,
	{ start, to }: { start: number; to: number },
): void {
	const { state } = view;
	const end = state.sliceDoc(to, to + CLOSING.length) === CLOSING
		? to + CLOSING.length
		: to;
	const imported = importChange(state.doc.toString());
	const changes = state.changes([
		{ from: start, to: end, insert: linkMarkup(suggestion) },
		...(imported ? [imported] : []),
	]);
	const cursor = changes.mapPos(end, 1);
	view.dispatch({
		changes,
		selection: EditorSelection.cursor(cursor),
		effects: startInsert.of(movedOrigins(state, cursor, changes.newLength)),
		userEvent: 'input.complete',
	});
}

// Insert mode resumes after the link.
function movedOrigins(state: EditorState, cursor: number, length: number) {
	return (state.field(insertOrigins, false) ?? []).map((origin) => ({
		...origin,
		from: cursor,
		to: Math.min(cursor + 1, length),
	}));
}

function option(
	suggestion: LinkSuggestion,
	{ label, detail, start }: { label: string; detail: string; start: number },
): Completion {
	return {
		label,
		...(detail === '' ? {} : { detail }),
		// Arguments: view, completion, from, to.
		apply: (view: EditorView, ...rest: [Completion, number, number]) => {
			applyLink(view, suggestion, { start, to: rest[2] });
		},
	};
}

// `[[Note#Heading`: the headings of the best match for `Note`.
async function sectionOptions(
	source: LinkSource,
	{ query, start }: { query: string; start: number },
): Promise<CompletionResult | null> {
	const mark = query.indexOf(SECTION_MARK);
	const [note] = await source.notes(query.slice(0, mark));
	if (!note) {
		return null;
	}
	const headings = await source.sections(note.target, query.slice(mark + 1));
	const options = headings.map((section) => option(
		{ ...note, section },
		{ label: section, detail: note.title, start },
	));
	const from = start + OPENING.length + mark + 1;
	return { from, options, filter: false };
}

async function linkOptions(
	context: CompletionContext,
	source: LinkSource,
): Promise<CompletionResult | null> {
	if (context.state.field(modeField, false) !== 'insert') {
		return null;
	}
	const found = context.matchBefore(LINK_START);
	if (!found) {
		return null;
	}
	const query = found.text.slice(OPENING.length);
	if (query.includes(SECTION_MARK)) {
		return sectionOptions(source, { query, start: found.from });
	}
	const suggestions = await source.notes(query);
	const options = suggestions.map((suggestion) => option(suggestion, {
		label: suggestion.title,
		detail: suggestion.folder ?? '',
		start: found.from,
	}));
	return { from: found.from + OPENING.length, options, filter: false };
}

// Keys of the list, as the menus of Helix: `Escape` is left to the editor,
// which leaves insert mode and closes the list.
const listKeys = Prec.highest(keymap.of([
	{ key: 'ArrowDown', run: moveCompletionSelection(true) },
	{ key: 'ArrowUp', run: moveCompletionSelection(false) },
	{ key: 'Ctrl-n', run: moveCompletionSelection(true) },
	{ key: 'Ctrl-p', run: moveCompletionSelection(false) },
	{ key: 'Tab', run: moveCompletionSelection(true) },
	{ key: 'Shift-Tab', run: moveCompletionSelection(false) },
	{ key: 'Enter', run: acceptCompletion },
]));

const closeOutsideInsert = EditorView.updateListener.of((update) => {
	if (update.state.field(modeField) !== 'insert'
		&& update.startState.field(modeField) === 'insert') {
		closeCompletion(update.view);
	}
});

export function linkCompletion(source: LinkSource): Extension {
	return [
		autocompletion({
			override: [async (context) => linkOptions(context, source)],
			defaultKeymap: false,
			icons: false,
		}),
		listKeys,
		closeOutsideInsert,
	];
}
