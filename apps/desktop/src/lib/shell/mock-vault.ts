// SPDX-License-Identifier: GPL-3.0-or-later
// Placeholder content of the interface mockup. The notes of the demo vault
// are real (rendered by the Rust core); the others only fill the explorer.

export interface MockNote {
	title: string;
	path: string;
}

export interface MockFolder {
	name: string;
	notes: MockNote[];
}

export interface Backlink {
	title: string;
	path: string;
	excerpt: string;
}

export const ROOT_NOTES: MockNote[] = [
	{ title: 'Demo note', path: 'Demo.typ' },
	{ title: 'Inbox', path: 'Inbox.typ' },
];

export const FOLDERS: MockFolder[] = [
	{
		name: 'Maths',
		notes: [
			{ title: 'Analyse', path: 'Maths/Analyse.typ' },
			{ title: 'Algèbre linéaire', path: 'Maths/Algèbre_linéaire.typ' },
			{ title: 'Probabilités', path: 'Maths/Probabilités.typ' },
		],
	},
	{
		name: 'Philo',
		notes: [
			{
				title: 'La poétique d\'Aristote',
				path: 'Philo/La_poétique_d\'Aristote.typ',
			},
		],
	},
	{
		name: 'Drafts',
		notes: [
			{ title: 'Ideas', path: 'Drafts/Ideas.typ' },
			{ title: 'Reading list', path: 'Drafts/Reading_list.typ' },
		],
	},
];

const BACKLINKS: Record<string, Backlink[]> = {
	'Demo.typ': [
		{
			title: 'Analyse',
			path: 'Maths/Analyse.typ',
			excerpt: 'Back to the demo note.',
		},
		{
			title: 'La poétique d\'Aristote',
			path: 'Philo/La_poétique_d\'Aristote.typ',
			excerpt: 'La tragédie est l\'imitation d\'une action noble. See the '
				+ 'demo note.',
		},
	],
	'Maths/Analyse.typ': [
		{
			title: 'Demo note',
			path: 'Demo.typ',
			excerpt: 'See Analyse, its section on integrals, and La poétique…',
		},
	],
};

export function backlinksOf(path: string): Backlink[] {
	return BACKLINKS[path] ?? [];
}

export function titleOf(path: string): string {
	const notes = [...ROOT_NOTES, ...FOLDERS.flatMap((folder) => folder.notes)];
	return notes.find((note) => note.path === path)?.title ?? path;
}

// Sources of the demo vault, for the editor pane.
const SOURCES = import.meta.glob<string>(
	'../../../../../examples/demo-vault/**/*.typ',
	{ query: '?raw', import: 'default', eager: true },
);

export function sourceOf(path: string): string {
	const entry = Object.entries(SOURCES).find(([file]) =>
		file.endsWith(`/demo-vault/${path}`));
	return entry?.[1] ?? `= ${titleOf(path)}\n\nNot in the demo vault.\n`;
}
