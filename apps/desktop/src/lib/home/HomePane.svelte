<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- The home screen of a pane without a note: find a note, the notes
     modified last, the pinned ones, the flashcards due. `j` / `k` move,
     `Enter` opens. -->
<script lang="ts">
	import { onMount } from 'svelte';

	import { listKeydown } from '../shell/list-keys.ts';
	import type { HomeData } from './home-data.ts';

	interface Props {
		data: HomeData;
		autofocus: boolean;
	}

	const { data, autofocus }: Props = $props();

	let element = $state<HTMLElement>();
	const ITEMS = '.entry';

	onMount(() => {
		if (autofocus) {
			element?.querySelector<HTMLElement>(ITEMS)?.focus();
		}
	});
</script>

<!-- Focusable so that its keys only reach this pane. -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<section
	bind:this={element}
	class="home-view"
	tabindex="-1"
	aria-label="Home"
	onkeydown={(event) => {
		listKeydown(event, {
			container: element,
			selector: ITEMS,
			onLeave: () => undefined,
		});
	}}
>
	<div class="find">
		<button
			class="entry field"
			onclick={() => {
				data.onFind('titles');
			}}
		>Find a note by title… <kbd>Space f</kbd></button>
		<button
			class="entry field"
			onclick={() => {
				data.onFind('text');
			}}
		>Search the text… <kbd>Space /</kbd></button>
	</div>
	{#if data.dueCount > 0}
		<button
			class="entry review"
			onclick={data.onReview}
		>{data.dueCount} flashcards to review <kbd>Space c</kbd></button>
	{/if}
	{#each [
		{ name: 'Recent', notes: data.recent },
		{ name: 'Pinned', notes: data.pinned },
	] as group (group.name)}
		{#if group.notes.length > 0}
			<h3>{group.name}</h3>
			<ul>
				{#each group.notes as note (note.path)}
					<li>
						<button
							class="entry"
							title={note.path}
							onclick={() => {
								data.onOpen(note.path);
							}}
						>{note.title}</button>
					</li>
				{/each}
			</ul>
		{/if}
	{/each}
</section>

<style>
	.home-view {
		overflow: auto;
		box-sizing: border-box;
		width: 100%;
		max-width: 38rem;
		margin: 0 auto;
		padding: 2.5rem 1.5rem;
		outline: none;
	}

	.find {
		display: grid;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}

	h3 {
		margin: 1.5rem 0 0.4rem;
		color: var(--muted);
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.entry {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 0.35rem 0.6rem;
		border: none;
		border-radius: 4px;
		background: none;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.entry:hover,
	.entry:focus-visible {
		outline: none;
		background: var(--hover);
	}

	.entry:focus-visible {
		box-shadow: inset 2px 0 0 var(--accent);
	}

	.field {
		border: 1px solid var(--border);
		color: var(--muted);
	}

	.review {
		color: var(--accent);
		font-weight: 600;
	}

	kbd {
		color: var(--muted);
		font-family: ui-monospace, monospace;
		font-size: 0.75rem;
	}
</style>
