// SPDX-License-Identifier: GPL-3.0-or-later
// An editor without a view, for tests: commands run on its state.
import { history } from '@codemirror/commands';
import {
	EditorSelection,
	EditorState,
	Transaction,
	type TransactionSpec,
} from '@codemirror/state';

import { type CommandName, runCommand } from './commands.ts';
import type { CommandContext, CommandTarget, EditorHost } from './context.ts';
import { insertOrigins } from './insert.ts';
import { jumpLabelsField } from './jump-labels.ts';
import { type EditorMode, modeField } from './mode.ts';
import { searchPatternField } from './search.ts';

export class TestEditor implements CommandTarget {
	state: EditorState;
	readonly calls: string[] = [];
	clipboardText = '';
	private readonly register = { text: '' };

	constructor(text: string, anchor = 0, head = anchor + 1) {
		this.state = EditorState.create({
			doc: text,
			selection: EditorSelection.single(anchor, head),
			extensions: [
				modeField,
				insertOrigins,
				jumpLabelsField,
				searchPatternField,
				history(),
				EditorState.allowMultipleSelections.of(true),
			],
		});
	}

	// Like `EditorView.dispatch`: bound to the editor, and CodeMirror
	// commands such as `undo` pass a ready transaction.
	readonly dispatch = (...specs: (Transaction | TransactionSpec)[]): void => {
		const [first] = specs;
		this.state = first instanceof Transaction
			? first.state
			: this.state.update(...specs).state;
	};

	run(...names: CommandName[]): this {
		for (const name of names) {
			runCommand(name, this.context());
		}
		return this;
	}

	runWith(name: CommandName, argument: string, count?: number): this {
		runCommand(name, { ...this.context(), count }, argument);
		return this;
	}

	get text(): string {
		return this.state.doc.toString();
	}

	// Selections as `[anchor, head]` pairs.
	get selections(): [number, number][] {
		return this.state.selection.ranges.map((range) => [
			range.anchor,
			range.head,
		]);
	}

	get mode(): EditorMode {
		return this.state.field(modeField);
	}

	private context(): CommandContext {
		const host: EditorHost = {
			write: async () => {
				this.calls.push('write');
				await Promise.resolve();
			},
			quit: (force) => {
				this.calls.push(force ? 'quit!' : 'quit');
			},
			openPrompt: (kind) => this.calls.push(`prompt:${kind}`),
			clipboard: {
				write: async (text) => {
					this.clipboardText = text;
					await Promise.resolve();
				},
				read: async () => Promise.resolve(this.clipboardText),
			},
		};
		return { target: this, host, register: this.register };
	}
}
