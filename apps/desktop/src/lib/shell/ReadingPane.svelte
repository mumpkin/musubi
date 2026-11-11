<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- A pane in reading mode: the note rendered by the Rust core. -->
<script lang="ts">
	import type { NoteView } from '../bindings/NoteView.ts';
	import { blockForLine } from '../reading/block-cursor.ts';
	import { toNoteMarkup } from '../reading/note-html.ts';
	import ReadingView from '../reading/ReadingView.svelte';
	import { renderNote } from '../reading/render-note.ts';

	interface Props {
		path: string;
		// Bumped when the note changes, to render it again.
		revision: number;
		// Bumped when a note is opened in the pane: the cursor goes to
		// `line` again.
		loads: number;
		// Source line (from 0) to show first: where the editor was.
		line: number | undefined;
		// Paths of the notes of the vault: links to others show as missing.
		notes: ReadonlySet<string>;
		onOpen: (path: string, text: string) => void;
		// The source line of the selected block.
		onLine: (line: number | undefined) => void;
		onEdit: (line: number) => void;
	}

	const {
		path,
		revision,
		loads,
		line,
		notes,
		onOpen,
		onLine,
		onEdit,
	}: Props = $props();

	let isFirstDisplay = $state(true);

	let view = $state<NoteView>();
	let failure = $state<string>();
	let selectedBlock = $state<number>();

	// The latest render asked for: a slower, older one must not replace it.
	let latest = 0;
	// The opening of a note shown so far, as `path:loads`.
	let shown = '';

	function render(notePath: string, opening: string): void {
		latest += 1;
		const request = latest;
		renderNote(notePath)
			.then((result) => {
				if (request !== latest) {
					return;
				}
				view = result;
				failure = undefined;
				if (opening !== shown) {
					shown = opening;
					selectedBlock = startBlock(result);
				}
			})
			.catch((error: unknown) => {
				failure = String(error);
			});
	}

	// Renders again when the note changes, is opened again or a new version
	// is saved.
	$effect(() => {
		// Read to render again on a save.
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		revision;
		render(path, `${path}:${String(loads)}`);
	});

	const markup = $derived(
		view?.note.html
			? toNoteMarkup(view.note.html, (note) => notes.has(note))
			: undefined,
	);

	// The block at `line`, among the blocks shown in the rendering.
	function startBlock(result: NoteView): number | undefined {
		const html = result.note.html;
		if (line === undefined || html === null) {
			return undefined;
		}
		const { blocks } = result.note;
		const rendered = [...blocks.keys()]
			.filter((index) => html.includes(`data-block="${String(index)}"`));
		return blockForLine(blocks, rendered, line);
	}

	function lineOf(block: number | undefined): number | undefined {
		return block === undefined
			? undefined
			: view?.note.blocks[block]?.startLine;
	}

	function selectBlock(block: number | undefined): void {
		selectedBlock = block;
		isFirstDisplay = false;
		onLine(lineOf(block));
	}

	function editBlock(block: number): void {
		onEdit(lineOf(block) ?? 0);
	}
</script>

<div class="reading-pane">
	{#if failure}
		<p class="message">Rendering needs the desktop app ({failure}).</p>
	{:else if view && !markup}
		<p class="message">
			{view.note.diagnostics[0]?.message ?? 'Nothing to show.'}
		</p>
	{/if}
	{#if markup}
		<ReadingView
			{markup}
			sourceBlocks={view?.note.blocks ?? []}
			{selectedBlock}
			{isFirstDisplay}
			onNavigate={onOpen}
			onSelect={selectBlock}
			onEdit={editBlock}
		/>
	{/if}
</div>

<style>
	.reading-pane {
		height: 100%;
		overflow: auto;
	}

	.message {
		margin: 2rem;
		color: var(--muted);
	}
</style>
