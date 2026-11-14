<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Filters of the graph, over its top left corner: every note, the notes
     linked to the note of the pane, or the notes of its folder. -->
<script lang="ts">
	import { folderOf, type GraphFilter } from './graph-filter.ts';

	interface Props {
		filter: GraphFilter;
		// Path of the note of the pane; `''` when there is none.
		current: string;
		onChange: (filter: GraphFilter) => void;
	}

	const { filter, current, onChange }: Props = $props();

	const folder = $derived(folderOf(current));
	const choices = $derived<{ value: GraphFilter; label: string }[]>([
		{ value: 'all', label: 'All notes' },
		{ value: 'links', label: 'Linked notes' },
		{ value: 'folder', label: folder === '' ? 'Vault root' : folder },
	]);
</script>

<div
	class="graph-filters"
	role="toolbar"
	aria-label="Notes shown in the graph"
>
	{#each choices as choice (choice.value)}
		<button
			type="button"
			aria-pressed={filter === choice.value}
			disabled={current === '' && choice.value !== 'all'}
			title={choice.value === 'folder'
				? 'The notes of this folder and of its subfolders'
				: undefined}
			onclick={() => {
				onChange(choice.value);
			}}
		>
			{choice.label}
		</button>
	{/each}
</div>

<style>
	.graph-filters {
		position: absolute;
		top: 0.5rem;
		left: 0.5rem;
		z-index: 1;
		display: flex;
		gap: 0.25rem;
		padding: 0.2rem;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--background);
	}

	button {
		padding: 0.15rem 0.6rem;
		border: none;
		border-radius: 4px;
		background: none;
		color: var(--muted);
		font: inherit;
		font-size: 0.85rem;
		cursor: pointer;
	}

	button[aria-pressed='true'] {
		background: var(--surface);
		color: var(--foreground);
	}

	button:disabled {
		opacity: 0.5;
		cursor: default;
	}
</style>
