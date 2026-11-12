// SPDX-License-Identifier: GPL-3.0-or-later
// Reads the text of the tree back: each line, its id if it has one, its
// name, and the folder line it sits under by its indentation.
import { ID_PATTERN, INDENT, type TreeEntry } from './tree-text.ts';

export interface TreeLine {
	// Line number, from 1, for error messages.
	number: number;
	indent: number;
	// The entry the line stands for, `undefined` for a new line.
	id: number | undefined;
	// The text after the id, trimmed; a folder keeps its final `/`.
	name: string;
	isFolder: boolean;
	// Index of the folder line holding it, `-1` at the vault root.
	parent: number;
}

export interface LineError {
	line: number;
	message: string;
}

export interface ParsedTree {
	lines: TreeLine[];
	errors: LineError[];
}

function indentWidth(indent: string): number {
	return indent.replaceAll('\t', INDENT).length;
}

// A known entry keeps its kind; a new line is a folder if it ends with `/`.
function isFolderLine(
	name: string,
	id: number | undefined,
	entries: ReadonlyMap<number, TreeEntry>,
): boolean {
	const kind = id === undefined ? undefined : entries.get(id)?.kind;
	return kind === undefined ? name.endsWith('/') : kind === 'folder';
}

// A line without its parent, which needs the lines before it.
function readLine(
	text: string,
	number: number,
	entries: ReadonlyMap<number, TreeEntry>,
): Omit<TreeLine, 'parent'> {
	const groups = ID_PATTERN.exec(text)?.groups;
	const indent = groups?.indent ?? /^\s*/u.exec(text)?.[0] ?? '';
	const id = groups?.id === undefined ? undefined : Number(groups.id);
	const name = text.replace(ID_PATTERN, '').trim();
	return {
		number,
		indent: indentWidth(indent),
		id,
		name,
		isFolder: isFolderLine(name, id, entries),
	};
}

// The folder lines that may hold a line indented by `indent`: those less
// indented, innermost last.
function closeFolders(open: number[], lines: TreeLine[], indent: number) {
	while (open.length > 0
		&& (lines[open.at(-1) ?? -1]?.indent ?? 0) >= indent) {
		open.pop();
	}
}

export function parseTree(
	text: string,
	entries: ReadonlyMap<number, TreeEntry>,
): ParsedTree {
	const lines: TreeLine[] = [];
	const errors: LineError[] = [];
	// Folder lines that may hold the next line, innermost last.
	const open: number[] = [];
	for (const [index, raw] of text.split('\n').entries()) {
		if (raw.trim() === '') {
			continue;
		}
		const line = readLine(raw, index + 1, entries);
		const previous = lines.at(-1);
		if (previous?.isFolder === false && line.indent > previous.indent) {
			errors.push({ line: line.number, message: 'Indented under a note' });
		}
		closeFolders(open, lines, line.indent);
		lines.push({ ...line, parent: open.at(-1) ?? -1 });
		if (line.isFolder) {
			open.push(lines.length - 1);
		}
	}
	return { lines, errors };
}
