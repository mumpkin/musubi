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

	import { noteAssets } from '../vault/assets.ts';
	import { linkSource } from '../vault/links.ts';
	import { imagePaste, type ImageTarget, listenForDrops } from './images.ts';
	import { PROMPT_LABELS, runPrompt } from './prompt.ts';
	import PromptLine from './PromptLine.svelte';

	interface Props {
		// Path of the note, from the vault root: images go to its folder.
		notePath: string;
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
		notePath,
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

	const images: ImageTarget = {
		note: () => notePath,
		onMessage: (message) => {
			onMessage(message);
		},
	};

	let parent = $state<HTMLElement>();
	let view: EditorView | undefined;
	let prompt = $state<PromptKind>();

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
			imagePaste(images),
			helix({
				host,
				linkSource: {
					...linkSource,
					assets: async () => noteAssets(notePath),
				},
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
		const stopDrops = listenForDrops(view, images);
		return () => {
			clearTimeout(autosaveTimer);
			stopDrops.then((stop) => {
				stop();
			}).catch(() => undefined);
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
				onMessage(String(error));
			});
	}
</script>

<div class="helix-editor">
	<div
		bind:this={parent}
		class="editor"
	></div>
	<!-- The mode shows in the status bar; this line is the command line. -->
	{#if prompt}
		<PromptLine
			label={PROMPT_LABELS[prompt]}
			onSubmit={submitPrompt}
			onCancel={closePrompt}
		/>
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

</style>
