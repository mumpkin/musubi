// SPDX-License-Identifier: GPL-3.0-or-later
// The explorer as a text editor of the vault tree, as oil.nvim: the text
// shown, the changes waiting for confirmation, and what `:w` and `:q` do.
import { type EditorMode, modeIndicator } from '@musubi/editor';

import type { FolderNode } from '../vault/tree.ts';
import { type AppliedTree, applyPlan } from './tree-apply.ts';
import { vaultCommands } from './tree-commands.ts';
import type { LineError } from './tree-parse.ts';
import { planChanges } from './tree-plan.ts';
import { type ChangeLine, summary } from './tree-summary.ts';
import {
	EMPTY_TREE,
	ID_PATTERN,
	type TreeText,
	treeText,
} from './tree-text.ts';

const UNSAVED = 'Unsaved changes: :w applies them, :q! discards them';

export interface TreeEditingHost {
	// The whole vault tree, archive included.
	root: () => FolderNode;
	// After the operations: the panes follow, the tree is read again.
	applied: (result: AppliedTree) => Promise<void>;
	open: (path: string) => void;
	message: (text: string) => void;
	// Back to the tree view of the explorer, focused.
	left: () => void;
}

export class TreeEditing {
	isActive = $state(false);
	mode = $state<EditorMode>('normal');
	hasFocus = $state(false);
	// The text the editor starts from; a new one remounts it.
	tree = $state.raw<TreeText>(EMPTY_TREE);
	startLine = $state(0);
	// The changes waiting for `y` or `n`.
	changes = $state<ChangeLine[]>();

	// The mode of the tree editor, shown in the header of the explorer.
	readonly modeLabel = $derived(modeIndicator(this.mode));

	private draft: string | undefined;
	private answer: ((isConfirmed: boolean) => void) | undefined;
	private readonly host: TreeEditingHost;

	constructor(host: TreeEditingHost) {
		this.host = host;
	}

	// Shows the tree as text, the cursor on `path` if given.
	start(path?: string): void {
		this.render(path);
		this.isActive = true;
	}

	readonly message = (text: string): void => {
		this.host.message(text);
	};

	readonly modeChanged = (mode: EditorMode): void => {
		this.mode = mode;
	};

	readonly focusChanged = (hasFocus: boolean): void => {
		this.hasFocus = hasFocus;
	};

	// `Space r` in the explorer, or its button.
	readonly toggle = (path: string): void => {
		if (this.isActive) {
			this.quit(false);
		} else {
			this.start(path);
		}
	};

	readonly changed = (text: string): void => {
		this.draft = text === this.tree.text ? undefined : text;
	};

	readonly quit = (force: boolean): void => {
		if (!force && this.draft !== undefined) {
			this.host.message(UNSAVED);
			return;
		}
		this.draft = undefined;
		this.isActive = false;
		this.mode = 'normal';
		this.host.left();
	};

	// `Enter` on a line: opens its note.
	readonly openLine = (line: string): void => {
		const entry = this.entryOf(line);
		if (entry?.kind === 'note') {
			this.host.open(entry.path);
		}
	};

	// `:w`: resolves to the invalid lines, or applies the changes once
	// confirmed. Rejects when they are not.
	readonly write = async (
		text: string,
		cursorLine: string,
	): Promise<LineError[]> => {
		const { entries } = this.tree;
		const plan = planChanges(text, entries);
		if (plan.errors.length > 0 || plan.operations.length === 0) {
			if (plan.operations.length === 0 && plan.errors.length === 0) {
				this.host.message('No changes');
			}
			return plan.errors;
		}
		this.changes = summary(plan.operations, entries);
		const isConfirmed = await new Promise<boolean>((resolve) => {
			this.answer = resolve;
		});
		if (!isConfirmed) {
			throw new Error('Changes not applied');
		}
		const result = await applyPlan(plan.operations, entries, vaultCommands);
		await this.host.applied(result);
		const path = this.entryOf(cursorLine)?.path;
		this.draft = undefined;
		this.render(result.moved.find(({ from }) => from === path)?.to ?? path);
		this.host.message(result.error ?? 'Changes applied');
		return [];
	};

	readonly answerChanges = (isConfirmed: boolean): void => {
		this.changes = undefined;
		this.answer?.(isConfirmed);
		this.answer = undefined;
	};

	private entryOf(line: string) {
		const id = ID_PATTERN.exec(line)?.groups?.id;
		return id === undefined ? undefined : this.tree.entries.get(Number(id));
	}

	private render(path: string | undefined): void {
		this.tree = treeText(this.host.root());
		const entry = [...this.tree.entries.values()]
			.find((candidate) => candidate.path === path);
		// Ids follow the lines: the entry `n` is on line `n - 1`.
		this.startLine = entry ? entry.id - 1 : 0;
	}
}
