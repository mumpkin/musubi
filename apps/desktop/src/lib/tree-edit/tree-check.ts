// SPDX-License-Identifier: GPL-3.0-or-later
// Checks the lines of an edited tree before anything changes on disk: as
// oil.nvim, an invalid line stops the whole save.
import type { LineError, TreeLine } from './tree-parse.ts';
import type { TreeEntry } from './tree-text.ts';

// The name of a folder line, without its final `/`.
export function folderName(name: string): string {
	return name.replace(/\/$/u, '').trim();
}

// What is wrong with a new line: its name may be a path, `a/b/Title`.
function newLineError(name: string): string | undefined {
	const isValidPath = !name.startsWith('/')
		&& name.split('/').every((part) => part.trim() !== '');
	return isValidPath ? undefined : 'Each part of a path needs a name';
}

// What is wrong with the line of an existing entry.
function entryLineError(line: TreeLine, entry: TreeEntry): string | undefined {
	if (entry.kind === 'folder' && folderName(line.name).includes('/')) {
		return 'A folder name cannot contain /';
	}
	if (entry.kind === 'note' && line.name.endsWith('/')) {
		return 'A note cannot become a folder';
	}
	return undefined;
}

// What is wrong with one line, if anything.
function lineError(
	line: TreeLine,
	entry: TreeEntry | undefined,
): string | undefined {
	if (line.id !== undefined && !entry) {
		return 'Unknown entry: was its id changed?';
	}
	const name = line.isFolder ? folderName(line.name) : line.name;
	if (name === '') {
		return 'Empty name';
	}
	return entry ? entryLineError(line, entry) : newLineError(name);
}

// Two folders of the same name, ignoring case, in the same folder.
function duplicateFolders(lines: TreeLine[]): LineError[] {
	const seen = new Set<string>();
	const errors: LineError[] = [];
	for (const line of lines.filter((candidate) => candidate.isFolder)) {
		const key = `${String(line.parent)}/${
			folderName(line.name).toLocaleLowerCase()
		}`;
		if (seen.has(key)) {
			errors.push({ line: line.number, message: 'Duplicate folder name' });
		}
		seen.add(key);
	}
	return errors;
}

export function checkLines(
	lines: TreeLine[],
	entries: ReadonlyMap<number, TreeEntry>,
): LineError[] {
	const errors: LineError[] = [];
	const ids = new Set<number>();
	for (const line of lines) {
		const entry = line.id === undefined ? undefined : entries.get(line.id);
		const message = lineError(line, entry);
		if (message !== undefined) {
			errors.push({ line: line.number, message });
		} else if (line.id !== undefined && ids.has(line.id)) {
			errors.push({
				line: line.number,
				message: 'This entry is there twice: copies are not supported',
			});
		}
		if (line.id !== undefined) {
			ids.add(line.id);
		}
	}
	return [...errors, ...duplicateFolders(lines)];
}
