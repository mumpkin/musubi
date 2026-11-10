<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- A pane in reading mode: the note rendered by the Rust core. -->
<script lang="ts">
	import type { NoteView } from '../bindings/NoteView.ts';
	import { toNoteMarkup } from '../reading/note-html.ts';
	import ReadingView from '../reading/ReadingView.svelte';
	import { renderNote } from '../reading/render-note.ts';

	interface Props {
		path: string;
		// Bumped when the note changes, to render it again.
		revision: number;
		onOpen: (path: string) => void;
	}

	const { path, revision, onOpen }: Props = $props();

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
					selectedBlock = undefined;
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

	function selectBlock(block: number | undefined): void {
		selectedBlock = block;
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
			onNavigate={onOpen}
			onSelect={selectBlock}
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
