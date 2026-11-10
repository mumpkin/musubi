<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Side panel listing notes by title. Folders fold; file names only show
     in the tooltip. -->
<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';

	import { FOLDERS, type MockNote, ROOT_NOTES } from './mock-vault.ts';

	interface Props {
		current: string;
		onOpen: (path: string) => void;
	}

	const { current, onOpen }: Props = $props();

	// Folded folders, by name.
	const folded = new SvelteSet(['Drafts']);

	function toggle(name: string): void {
		if (folded.has(name)) {
			folded.delete(name);
		} else {
			folded.add(name);
		}
	}
</script>

{#snippet note(entry: MockNote)}
	<li>
		<button
			class="note"
			class:current={entry.path === current}
			title={entry.path}
			onclick={() => {
				onOpen(entry.path);
			}}
		>{entry.title}</button>
	</li>
{/snippet}

<nav
	class="explorer"
	aria-label="Notes"
>
	<h2>Notes</h2>
	<ul>
		{#each FOLDERS as folder (folder.name)}
			<li>
				<button
					class="folder"
					aria-expanded={!folded.has(folder.name)}
					onclick={() => {
						toggle(folder.name);
					}}
				>
					<span class="chevron">{folded.has(folder.name) ? '▸' : '▾'}</span>
					{folder.name}
				</button>
				{#if !folded.has(folder.name)}
					<ul>
						{#each folder.notes as entry (entry.path)}
							{@render note(entry)}
						{/each}
					</ul>
				{/if}
			</li>
		{/each}
		{#each ROOT_NOTES as entry (entry.path)}
			{@render note(entry)}
		{/each}
	</ul>
</nav>

<style>
	.explorer {
		height: 100%;
		overflow: auto;
		padding: 0.5rem 0.25rem;
		background: var(--surface);
	}

	h2 {
		margin: 0.25rem 0.5rem 0.5rem;
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

	ul ul {
		padding-left: 1rem;
	}

	button {
		display: block;
		width: 100%;
		padding: 0.2rem 0.5rem;
		border: none;
		border-radius: 4px;
		background: none;
		color: inherit;
		font: inherit;
		font-size: 0.9rem;
		text-align: left;
		cursor: pointer;
	}

	button:hover {
		background: var(--hover);
	}

	.note.current {
		background: var(--selection);
	}

	.chevron {
		display: inline-block;
		width: 1rem;
		color: var(--muted);
	}
</style>
