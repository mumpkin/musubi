<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- The vault tree as text in a Helix editor, as oil.nvim shows a folder.
     `:w` applies the changes, `:q` goes back to the tree view, `Enter`
     opens the note of the line. -->
<script lang="ts">
	import '../editor/helix-editor.css';

	import { history } from '@codemirror/commands';
	import { EditorState, Prec } from '@codemirror/state';
	import { drawSelection, EditorView } from '@codemirror/view';
	import {
		type EditorHost,
		type EditorMode,
		helix,
		modeField,
		type PromptKind,
	} from '@musubi/editor';
	import {
		readText,
		writeText,
	} from '@tauri-apps/plugin-clipboard-manager';
	import { onMount } from 'svelte';

	import { PROMPT_LABELS, runPrompt } from '../editor/prompt.ts';
	import PromptLine from '../editor/PromptLine.svelte';
	import { showErrors, treeDecorations } from './tree-decorations.ts';
	import type { LineError } from './tree-parse.ts';
	import { ID_PATTERN } from './tree-text.ts';

	interface Props {
		text: string;
		// Line (from 0) of the cursor at the start.
		startLine: number;
		// Resolves to the invalid lines; rejects if nothing was applied.
		onWrite: (text: string, cursorLine: string) => Promise<LineError[]>;
		onQuit: (force: boolean) => void;
		onChange: (text: string) => void;
		onOpenLine: (line: string) => void;
		onModeChange: (mode: EditorMode) => void;
		onFocusChange: (hasFocus: boolean) => void;
		onMessage: (message: string) => void;
	}

	const {
		text,
		startLine,
		onWrite,
		onQuit,
		onChange,
		onOpenLine,
		onModeChange,
		onFocusChange,
		onMessage,
	}: Props = $props();

	let parent = $state<HTMLElement>();
	let view: EditorView | undefined;
	let prompt = $state<PromptKind>();

	function cursorLine(editor: EditorView): string {
		return editor.state.doc.lineAt(editor.state.selection.main.head).text;
	}

	const host: EditorHost = {
		write: async () => {
			if (!view) {
				return;
			}
			const editor = view;
			const errors = await onWrite(
				editor.state.doc.toString(),
				cursorLine(editor),
			);
			if (errors.length > 0) {
				editor.dispatch({ effects: showErrors.of(errors) });
				const count = errors.length === 1
					? '1 invalid line'
					: `${String(errors.length)} invalid lines`;
				throw new Error(`${count}: nothing applied`);
			}
		},
		quit: (force) => {
			onQuit(force);
		},
		openPrompt: (kind) => {
			prompt = kind;
		},
		clipboard: { write: writeText, read: readText },
	};

	// `Enter` in normal mode opens the note of the line, as in oil.nvim.
	const openOnEnter = Prec.highest(EditorView.domEventHandlers({
		keydown: (event, editor) => {
			const isPlain = !event.ctrlKey && !event.altKey && !event.metaKey;
			if (event.key !== 'Enter' || !isPlain
				|| editor.state.field(modeField) === 'insert') {
				return false;
			}
			event.preventDefault();
			onOpenLine(cursorLine(editor));
			return true;
		},
	}));

	export function focus(): void {
		view?.focus();
	}

	onMount(() => {
		if (!parent) {
			return undefined;
		}
		const doc = text;
		view = new EditorView({
			parent,
			state: EditorState.create({
				doc,
				extensions: [
					history(),
					drawSelection(),
					openOnEnter,
					treeDecorations(),
					EditorView.updateListener.of((update) => {
						if (update.docChanged) {
							onChange(update.state.doc.toString());
						}
						if (update.focusChanged) {
							onFocusChange(update.view.hasFocus);
						}
					}),
					helix({ host, onModeChange }),
				],
			}),
		});
		const number = Math.min(startLine + 1, view.state.doc.lines);
		const line = view.state.doc.line(number);
		const from = line.from + (ID_PATTERN.exec(line.text)?.[0].length ?? 0);
		view.dispatch({
			selection: { anchor: from, head: Math.min(from + 1, line.to) },
			scrollIntoView: true,
		});
		view.focus();
		onFocusChange(view.hasFocus);
		return () => {
			onFocusChange(false);
			view?.destroy();
		};
	});

	function closePrompt(): void {
		prompt = undefined;
		view?.focus();
	}

	function submitPrompt(line: string): void {
		const kind = prompt;
		closePrompt();
		if (!view || !kind) {
			return;
		}
		runPrompt({ view, host, kind, line })
			.then((failure) => {
				if (failure !== undefined) {
					onMessage(failure);
				}
			})
			.catch((error: unknown) => {
				const isError = error instanceof Error;
				onMessage(isError ? error.message : String(error));
			});
	}
</script>

<div class="tree-editor">
	<div
		bind:this={parent}
		class="editor helix-host"
	></div>
	{#if prompt}
		<PromptLine
			label={PROMPT_LABELS[prompt]}
			onSubmit={submitPrompt}
			onCancel={closePrompt}
		/>
	{/if}
</div>

<style>
	.tree-editor {
		display: grid;
		grid-template-rows: 1fr auto;
		height: 100%;
		min-height: 0;
	}

	.editor {
		overflow: hidden;
		min-height: 0;
	}

	/* Long names do not wrap: the editor scrolls sideways. */
	.editor :global(.cm-editor) {
		height: 100%;
		font-size: 0.9rem;
	}

	.editor :global(.tree-folder) {
		color: var(--accent);
	}

	.editor :global(.tree-error) {
		text-decoration: underline wavy var(--error);
	}

	.editor :global(.tree-error-message) {
		margin-left: 1rem;
		color: var(--error);
		font-size: 0.8rem;
	}
</style>
