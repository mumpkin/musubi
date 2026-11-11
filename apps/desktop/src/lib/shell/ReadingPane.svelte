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
		// Source line (from 0) to show first: where the editor was.
		line: number | undefined;
		onOpen: (path: string) => void;
		// The source line of the selected block.
		onLine: (line: number | undefined) => void;
		onEdit: (line: number) => void;
	}

	const { path, revision, line, onOpen, onLine, onEdit }: Props = $props();

	let isFirstDisplay = $state(true);

	let view = $state<NoteView>();
	let failure = $state<string>();
	let selectedBlock = $state<number>();

	// The latest render asked for: a slower, older one must not replace it.
	let latest = 0;

	function render(notePath: string, version: number): void {
		latest += 1;
		const request = latest;
		renderNote(notePath)
			.then((result) => {
				if (request !== latest) {
					return;
				}
				view = result;
				failure = undefined;
				if (version === 0) {
					selectedBlock = startBlock(result);
				}
			})
			.catch((error: unknown) => {
				failure = String(error);
			});
	}

	// Renders again when the note changes or a new version is saved.
	$effect(() => {
		render(path, revision);
	});

	const markup = $derived(
		view?.note.html ? toNoteMarkup(view.note.html) : undefined,
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
