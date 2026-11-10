<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Prototype: renders the notes of the demo vault in the reading view. -->
<script lang="ts">
	import type { NoteView } from '../bindings/NoteView.ts';
	import { toNoteMarkup } from './note-html.ts';
	import ReadingView from './ReadingView.svelte';
	import { renderNote } from './render-note.ts';

	const DEMO_NOTES = [
		'Demo.typ',
		'Maths/Analyse.typ',
		'Philo/La_poétique_d\'Aristote.typ',
		'Missing_note.typ',
	];

	let path = $state('Demo.typ');
	let view = $state<NoteView>();
	let failure = $state<string>();
	let selectedBlock = $state<number>();

	$effect(() => {
		renderNote(path)
			.then((result) => {
				view = result;
				selectedBlock = undefined;
				failure = undefined;
			})
			.catch((error: unknown) => {
				failure = String(error);
			});
	});

	function openNote(note: string): void {
		path = note;
	}

	function selectBlock(block: number | undefined): void {
		selectedBlock = block;
	}

	const block = $derived(
		selectedBlock === undefined
			? undefined
			: view?.note.blocks[selectedBlock],
	);

	const markup = $derived(
		view?.note.html ? toNoteMarkup(view.note.html) : undefined,
	);
</script>

<header>
	<nav>
		{#each DEMO_NOTES as note (note)}
			<button
				class:active={note === path}
				onclick={() => (path = note)}
			>{note}</button>
		{/each}
	</nav>
	{#if view}
		<span class="muted">
			compiled in {view.compileMilliseconds.toFixed(1)} ms ·
			{view.note.index.links.length} links ·
			{view.note.index.cards.length} cards ·
			{view.note.index.tasks.length} tasks
		</span>
	{/if}
</header>

{#if failure}
	<p class="error">Running outside Tauri? {failure}</p>
{/if}

{#if view && view.note.diagnostics.length > 0}
	<ul class="diagnostics">
		{#each view.note.diagnostics as diagnostic, index (index)}
			<li class={diagnostic.severity}>
				{diagnostic.severity}
				{#if diagnostic.position}
					(line {diagnostic.position.line + 1})
				{/if}: {diagnostic.message}
			</li>
		{/each}
	</ul>
{/if}

<p class="cursor muted">
	{#if block}
		Block {selectedBlock}: {block.kind},
		lines {block.startLine + 1}–{block.endLine + 1},
		bytes {block.start}–{block.end}
	{:else}
		Press j / k or click a block to see its source range
	{/if}
</p>

{#if markup}
	<ReadingView
		{markup}
		{selectedBlock}
		onNavigate={openNote}
		onSelect={selectBlock}
	/>
{/if}

<style>
	header {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 1rem;
		border-bottom: 1px solid var(--border);
	}

	nav {
		display: flex;
		gap: 0.25rem;
	}

	button {
		padding: 0.25rem 0.6rem;
		border: 1px solid transparent;
		border-radius: 4px;
		background: none;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}

	button.active {
		border-color: var(--border);
		background: var(--surface);
	}

	.muted {
		color: var(--muted);
		font-size: 0.85rem;
	}

	.cursor {
		margin: 0;
		padding: 0.4rem 1rem;
		border-bottom: 1px solid var(--border);
	}

	.diagnostics,
	.error {
		margin: 1rem;
		font-family: ui-monospace, monospace;
		font-size: 0.85rem;
	}

	.error,
	.diagnostics .error {
		color: var(--error);
	}

	.diagnostics .warning {
		color: var(--warning);
	}
</style>
