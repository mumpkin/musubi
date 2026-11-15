<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- The controls of the graph, in a small panel over its bottom left
     corner: which notes it shows (all, linked, a folder), the shape of the
     notes, their grouping by folder, and the note selected with a click,
     to open. It folds down to its title. -->
<script lang="ts">
	import { slide } from 'svelte/transition';

	import Icon from '../shell/Icon.svelte';
	import { folderPalette } from '../vault/folder-palette.svelte.ts';
	import ChoiceRow from './ChoiceRow.svelte';
	import FolderList from './FolderList.svelte';
	import { folderOf, type GraphFilter } from './graph-filter.ts';
	import { graphOptions, type NodeShape } from './graph-options.svelte.ts';

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
		onFilter({ kind, folder: filter.folder });
	}

	function chooseShape(shape: NodeShape): void {
		graphOptions.setShape(shape);
	}

	function chooseGrouping(grouping: 'off' | 'folders'): void {
		graphOptions.setGrouped(grouping === 'folders');
	}

	function pickFolder(folder: string): void {
		onFilter({ kind: 'folder', folder });
	}

	// Folding and unfolding the panel, smoothly.
	const FOLD_MILLISECONDS = 160;

	const kinds = $derived([
		{ value: 'all', label: 'All' },
		{ value: 'links', label: 'Linked', isDisabled: !centre },
		{ value: 'folder', label: 'Folder' },
	] as const);
	const SHAPES = [
		{ value: 'dot', label: 'Dots' },
		{ value: 'pill', label: 'Pills' },
	] as const;
	const GROUPS = [
		{ value: 'off', label: 'Off' },
		{ value: 'folders', label: 'By folder' },
	] as const;

	// The folder shown by the folder filter: the one chosen, or the folder
	// of the selected note.
	const folder = $derived(
		filter.folder ?? (centre ? folderOf(centre.path) : ''),
	);

	function colorOf(path: string): string {
		return folderPalette.colorOf(folderOf(path)) ?? 'var(--muted)';
	}
	const folderName = $derived(folder === '' ? 'the vault root' : folder);

	// What the graph shows, in words.
	const summary = $derived.by(() => {
		if (filter.kind === 'links' && centre) {
			return `Notes linked to ${centre.title}`;
		}
		if (filter.kind === 'folder') {
			return `Notes in ${folderName} and its subfolders`;
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
		<span class="chevron">
			<Icon name={isFolded ? 'folded' : 'unfolded'} />
		</span>
		<span>Graph</span>
	</button>
	{#if !isFolded}
		<div
			class="panel-body"
			transition:slide={{ duration: FOLD_MILLISECONDS }}
		>
			<ChoiceRow
				label="Show"
				description="Notes shown"
				choices={kinds}
				checked={filter.kind}
				onChoose={choose}
			/>
			{#if filter.kind === 'folder'}
				<FolderList
					picked={folder}
					onPick={pickFolder}
				/>
			{/if}
			<p class="summary">{summary}</p>
			<ChoiceRow
				label="Nodes"
				description="Shape of the notes"
				choices={SHAPES}
				checked={graphOptions.shape}
				onChoose={chooseShape}
			/>
			<ChoiceRow
				label="Group"
				description="Grouping of the notes"
				choices={GROUPS}
				checked={graphOptions.isGrouped ? 'folders' : 'off'}
				onChoose={chooseGrouping}
			/>
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
		</div>
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
		padding: 0.4rem 0.6rem;
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
		gap: 0.3rem;
		align-items: center;
		padding: 0.1rem 0;
		color: var(--muted);
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.chevron {
		display: grid;
		place-items: center;
		width: 1rem;
	}

	.panel-body {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
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
