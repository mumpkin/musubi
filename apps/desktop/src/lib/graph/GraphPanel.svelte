<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- The controls of the graph, in a small panel over its bottom left
     corner: which notes it shows, how deep in the folders, and the note
     selected with a click, to open. It folds down to its title. -->
<script lang="ts">
	import { folderPalette } from '../vault/folder-palette.svelte.ts';
	import { folderOf, type GraphFilter } from './graph-filter.ts';

	interface Note {
		path: string;
		title: string;
	}

	interface Props {
		filter: GraphFilter;
		// The note the filters keep around: the selected one, or the note of
		// the pane; `undefined` without either.
		centre: Note | undefined;
		selected: Note | undefined;
		onFilter: (filter: GraphFilter) => void;
		onOpen: (path: string) => void;
	}

	const { filter, centre, selected, onFilter, onOpen }: Props = $props();

	let isFolded = $state(false);

	function choose(kind: GraphFilter['kind']): void {
		onFilter({ kind, depth: filter.depth });
	}

	const KINDS = [
		{ kind: 'all', label: 'All' },
		{ kind: 'links', label: 'Linked' },
		{ kind: 'folder', label: 'Folder' },
	] as const;
	const DEPTHS = [
		{ depth: 0, label: 'This folder' },
		{ depth: 1, label: '1' },
		{ depth: 2, label: '2' },
		{ depth: undefined, label: 'All' },
	] as const;

	const folder = $derived(centre ? folderOf(centre.path) : '');

	function colorOf(path: string): string {
		return folderPalette.colorOf(folderOf(path)) ?? 'var(--muted)';
	}
	const folderName = $derived(folder === '' ? 'the vault root' : folder);

	// What the graph shows, in words.
	const summary = $derived.by(() => {
		if (filter.kind === 'links' && centre) {
			return `Notes linked to ${centre.title}`;
		}
		if (filter.kind === 'folder' && centre) {
			const below = filter.depth === 0 ? '' : ' and below';
			return `Notes in ${folderName}${below}`;
		}
		return 'Every note of the vault';
	});
</script>

<div
	class="graph-panel"
	role="group"
	aria-label="Graph controls"
>
	<button
		type="button"
		class="panel-header"
		aria-expanded={!isFolded}
		onclick={() => {
			isFolded = !isFolded;
		}}
	>
		<span>Graph</span>
		<span class="chevron">{isFolded ? '▴' : '▾'}</span>
	</button>
	{#if !isFolded}
		<div class="row">
			<span class="label">Show</span>
			<div
				class="choices"
				role="radiogroup"
				aria-label="Notes shown"
			>
				{#each KINDS as choice (choice.kind)}
					<button
						type="button"
						role="radio"
						aria-checked={filter.kind === choice.kind}
						disabled={!centre && choice.kind !== 'all'}
						onclick={() => {
							choose(choice.kind);
						}}
					>{choice.label}</button>
				{/each}
			</div>
		</div>
		{#if filter.kind === 'folder'}
			<div class="row">
				<span class="label">Depth</span>
				<div
					class="choices"
					role="radiogroup"
					aria-label="Subfolders shown"
				>
					{#each DEPTHS as choice (choice.label)}
						<button
							type="button"
							role="radio"
							aria-checked={filter.depth === choice.depth}
							onclick={() => {
								onFilter({ kind: 'folder', depth: choice.depth });
							}}
						>{choice.label}</button>
					{/each}
				</div>
			</div>
		{/if}
		<p class="summary">{summary}</p>
		{#if selected}
			<div class="selected">
				<span
					class="dot"
					style:background={colorOf(selected.path)}
				></span>
				<span
					class="title"
					title={selected.path}
				>{selected.title}</span>
				<button
					type="button"
					class="open"
					title="Open the note (Enter, or a double click)"
					onclick={() => {
						onOpen(selected.path);
					}}
				>Open</button>
			</div>
		{/if}
	{/if}
</div>

<style>
	.graph-panel {
		position: absolute;
		bottom: 0.75rem;
		left: 0.75rem;
		z-index: 1;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		width: 16rem;
		max-width: calc(100% - 1.5rem);
		padding: 0.4rem 0.6rem 0.6rem;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--background);
		font-size: 0.85rem;
	}

	button {
		border: none;
		background: none;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}

	button:focus-visible {
		outline: 1px solid var(--accent);
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		padding: 0.1rem 0;
		color: var(--muted);
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.row {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.label {
		flex-shrink: 0;
		width: 2.8rem;
		color: var(--muted);
		font-size: 0.8rem;
	}

	.choices {
		display: flex;
		flex: 1;
		padding: 0.15rem;
		border-radius: 6px;
		background: var(--surface);
	}

	.choices button {
		flex: 1;
		padding: 0.1rem 0.3rem;
		border-radius: 4px;
		color: var(--muted);
		white-space: nowrap;
	}

	.choices button[aria-checked='true'] {
		background: var(--background);
		box-shadow: 0 0 0 1px var(--border);
		color: var(--foreground);
	}

	.choices button:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.summary {
		overflow: hidden;
		margin: 0;
		color: var(--muted);
		font-size: 0.8rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.selected {
		display: flex;
		gap: 0.4rem;
		align-items: center;
		padding-top: 0.4rem;
		border-top: 1px solid var(--border);
	}

	.dot {
		flex-shrink: 0;
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 50%;
	}

	.title {
		overflow: hidden;
		flex: 1;
		min-width: 0;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.open {
		padding: 0.1rem 0.5rem;
		border-radius: 4px;
		background: var(--surface);
		color: var(--accent);
	}

	.open:hover {
		background: var(--hover);
	}
</style>
