<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- CodeMirror 6 with the Helix profile, a status bar and a command line. -->
<script lang="ts">
	import { history } from '@codemirror/commands';
	import { EditorState } from '@codemirror/state';
	import { drawSelection, EditorView, lineNumbers } from '@codemirror/view';
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

	import { runPrompt } from './prompt.ts';

	interface Props {
		text: string;
		onWrite: (text: string) => void;
		onQuit: () => void;
		onModeChange?: (mode: EditorMode) => void;
	}

	const { text, onWrite, onQuit, onModeChange }: Props = $props();

	let parent = $state<HTMLElement>();
	let promptInput = $state<HTMLInputElement>();
	let view: EditorView | undefined;
	let prompt = $state<PromptKind>();
	let promptText = $state('');

	const host: EditorHost = {
		write: () => {
			onWrite(view?.state.doc.toString() ?? '');
		},
		quit: () => {
			onQuit();
		},
		openPrompt: (kind) => {
			prompt = kind;
			promptText = '';
		},
		// Through Tauri: the webview cannot read the system clipboard.
		clipboard: { write: writeText, read: readText },
	};

	onMount(() => {
		if (!parent) {
			return undefined;
		}
		view = new EditorView({
			parent,
			state: EditorState.create({
				doc: text,
				extensions: [
					lineNumbers(),
					// Notes are prose: long lines wrap.
					EditorView.lineWrapping,
					history(),
					drawSelection(),
					typstLanguage(),
					helix({
						host,
						onModeChange: (next) => {
							onModeChange?.(next);
						},
					}),
				],
			}),
		});
		view.dispatch({ selection: { anchor: 0, head: 1 } });
		return () => view?.destroy();
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
			runPrompt({ view, host, kind, line: promptText });
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
				<span>{prompt === 'command' ? ':' : 'select:'}</span>
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
