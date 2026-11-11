<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- CodeMirror 6 with the Helix profile, a status bar and a command line. -->
<script lang="ts">
	import { history } from '@codemirror/commands';
	import { EditorState, type Extension } from '@codemirror/state';
	import {
		drawSelection,
		EditorView,
		lineNumbers,
		type ViewUpdate,
	} from '@codemirror/view';
	import {
		type EditorHost,
		type EditorMode,
		helix,
		type PromptKind,
	} from '@musubi/editor';
	import {
		readText,
		writeText,
	} from '@tauri-apps/plugin-clipboard-manager';
	import { typst_lezer as typstLanguage } from 'codemirror-lang-typst/lezer';
	import { onMount } from 'svelte';

	import { linkSource } from '../vault/links.ts';
	import { runPrompt } from './prompt.ts';

	interface Props {
		// Text to edit: the saved note, or unsaved changes kept by the pane.
		text: string;
		// The note as saved on disk, to tell unsaved changes.
		savedText: string;
		onWrite: (text: string) => Promise<void>;
		onQuit: (force: boolean) => void;
		// The unsaved text, or `undefined` once saved.
		onDraft: (text: string | undefined) => void;
		onMessage: (message: string) => void;
		onModeChange?: (mode: EditorMode) => void;
		// Seconds of pause before saving, or `undefined` without autosave.
		autosaveDelay?: number | undefined;
		// Takes the keyboard focus once on screen.
		autofocus?: boolean;
		// Source line (from 0) to start on.
		initialLine?: number | undefined;
		// The line of the cursor, as it moves.
		onCursorLine?: (line: number) => void;
	}

	const {
		text,
		savedText,
		onWrite,
		onQuit,
		onDraft,
		onMessage,
		onModeChange,
		autosaveDelay,
		autofocus = false,
		initialLine,
		onCursorLine,
	}: Props = $props();

	const MILLISECONDS_PER_SECOND = 1000;
	const PROMPT_LABELS: Record<PromptKind, string> = {
		command: ':',
		select: 'select:',
		search: 'search:',
		reverseSearch: 'reverse-search:',
	};
	let autosaveTimer: ReturnType<typeof setTimeout> | undefined;

	// Saves after a pause in typing, when autosave is on.
	function scheduleAutosave(): void {
		clearTimeout(autosaveTimer);
		if (autosaveDelay === undefined) {
			return;
		}
		autosaveTimer = setTimeout(() => {
			host.write().catch((error: unknown) => {
				onMessage(String(error));
			});
		}, autosaveDelay * MILLISECONDS_PER_SECOND);
	}

	// svelte-ignore state_referenced_locally
	let saved = savedText;

	let parent = $state<HTMLElement>();
	let promptInput = $state<HTMLInputElement>();
	let view: EditorView | undefined;
	let prompt = $state<PromptKind>();
	let promptText = $state('');

	const host: EditorHost = {
		write: async () => {
			const current = view?.state.doc.toString() ?? '';
			await onWrite(current);
			saved = current;
			onDraft(undefined);
		},
		quit: (force) => {
			onQuit(force);
		},
		openPrompt: (kind) => {
			prompt = kind;
			promptText = '';
		},
		// Through Tauri: the webview cannot read the system clipboard.
		clipboard: { write: writeText, read: readText },
	};

	// Puts the cursor on the first character of `line` (from 0), centred.
	function startAt(editor: EditorView, line: number | undefined): void {
		const { doc } = editor.state;
		const number = Math.min(Math.max((line ?? 0) + 1, 1), doc.lines);
		const from = doc.line(number).from;
		editor.dispatch({
			selection: { anchor: from, head: Math.min(from + 1, doc.length) },
			// `y` is the name of the CodeMirror option.
			// eslint-disable-next-line id-length
			effects: EditorView.scrollIntoView(from, { y: 'center' }),
		});
	}

	// Reports the cursor line and unsaved changes to the pane.
	function reportChanges(update: ViewUpdate): void {
		const { state } = update;
		if (update.selectionSet) {
			const cursor = state.selection.main.head;
			onCursorLine?.(state.doc.lineAt(cursor).number - 1);
		}
		if (update.docChanged) {
			const current = state.doc.toString();
			onDraft(current === saved ? undefined : current);
			scheduleAutosave();
		}
	}

	function extensions(): Extension[] {
		return [
			lineNumbers(),
			// Notes are prose: long lines wrap.
			EditorView.lineWrapping,
			history(),
			drawSelection(),
			typstLanguage(),
			EditorView.updateListener.of(reportChanges),
			helix({
				host,
				linkSource,
				onModeChange: (next) => {
					onModeChange?.(next);
				},
			}),
		];
	}

	onMount(() => {
		if (!parent) {
			return undefined;
		}
		view = new EditorView({
			parent,
			state: EditorState.create({ doc: text, extensions: extensions() }),
		});
		startAt(view, initialLine);
		if (autofocus) {
			view.focus();
		}
		return () => {
			clearTimeout(autosaveTimer);
			view?.destroy();
		};
	});

	$effect(() => {
		if (prompt) {
			promptInput?.focus();
		}
	});

	function closePrompt(): void {
		prompt = undefined;
		view?.focus();
	}

	function handlePromptKey(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			closePrompt();
		} else if (event.key === 'Enter' && view && prompt) {
			// The editor gets the focus back: `Enter` must not reach it.
			event.preventDefault();
			const kind = prompt;
			closePrompt();
			runPrompt({ view, host, kind, line: promptText })
				.then((failure) => {
					if (failure !== undefined) {
						onMessage(failure);
					}
				})
				.catch((error: unknown) => {
					onMessage(String(error));
				});
		}
	}
</script>

<div class="helix-editor">
	<div
		bind:this={parent}
		class="editor"
	></div>
	<!-- The mode shows in the status bar; this line is the command line. -->
	{#if prompt}
		<footer>
			<label>
				<span>{PROMPT_LABELS[prompt]}</span>
				<input
					bind:this={promptInput}
					bind:value={promptText}
					onkeydown={handlePromptKey}
					spellcheck="false"
				/>
			</label>
		</footer>
	{/if}
</div>

<style>
	.helix-editor {
		display: grid;
		grid-template-rows: 1fr auto;
		height: 100%;
		min-height: 0;
	}

	.editor {
		overflow: auto;
		min-height: 0;
	}

	.editor :global(.cm-editor) {
		height: 100%;
		font-size: 0.95rem;
	}

	.editor :global(.cm-scroller) {
		font-family: ui-monospace, 'DejaVu Sans Mono', monospace;
	}

	.editor :global(.cm-selectionBackground),
	.editor :global(.cm-focused .cm-selectionBackground) {
		background: var(--selection);
	}

	/* Outside insert mode the block cursor replaces the caret of CodeMirror,
	which would sit after the selection, on the next line after `x`. */
	.editor :global(.helix-normal .cm-cursorLayer),
	.editor :global(.helix-select .cm-cursorLayer) {
		display: none;
	}

	.editor :global(.helix-normal .cm-content),
	.editor :global(.helix-select .cm-content) {
		caret-color: transparent;
	}

	.editor :global(.helix-cursor) {
		outline: none;
		background: var(--accent);
		color: var(--background);
	}

	footer {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		padding: 0.25rem 0.75rem;
		border-top: 1px solid var(--border);
		font-family: ui-monospace, monospace;
		font-size: 0.85rem;
	}

	label {
		display: flex;
		flex: 1;
		gap: 0.25rem;
	}

	input {
		flex: 1;
		border: none;
		outline: none;
		background: none;
		color: inherit;
		font: inherit;
	}
</style>
