<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Side panel listing the notes of the vault by title. Folders fold; file
     paths only show in tooltips. -->
<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';

	import type { NoteEntry } from '../bindings/NoteEntry.ts';
	import type { FolderNode } from '../vault/tree.ts';
	import ExplorerFolder from './ExplorerFolder.svelte';
	import ExplorerSection from './ExplorerSection.svelte';
	import { focusFirst, listKeydown } from './list-keys.ts';

	interface Props {
		vaultName: string;
		root: FolderNode;
		pinned: NoteEntry[];
		recent: NoteEntry[];
		pinnedPaths: ReadonlySet<string>;
		current: string;
		onOpen: (path: string) => void;
		onPin: (path: string) => void;
		onCreate: (kind: 'note' | 'folder', folder: string) => void;
		onDelete: (path: string) => void;
		// `Escape`: the focus goes back to the pane.
		onLeave: () => void;
	}

	const {
		vaultName,
		root,
		pinned,
		recent,
		onCreate,
		onLeave,
		...rows
	}: Props = $props();

	// Folded folders, by path.
	const folded = new SvelteSet<string>();

	// The entries that `j` and `k` move between.
	const ITEMS = '.folder, .note';
	let element = $state<HTMLElement>();

	// `Space h` / `Space l`: the focus goes to the current note.
	export function focusList(): void {
		focusFirst(element, ITEMS, '.tree .note.current');
	}
</script>

<!-- `j`, `k`, `l` and `Escape` reach the panel from its entries. -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<nav
	bind:this={element}
	class="explorer"
	aria-label="Notes"
	tabindex="-1"
	onkeydown={(event) => {
		listKeydown(event, { container: element, selector: ITEMS, onLeave });
	}}
>
	<header>
		<h2 title={vaultName}>{vaultName}</h2>
		<button
			title="New note"
			onclick={() => {
				onCreate('note', '');
			}}
		>+</button>
		<button
			title="New folder"
			onclick={() => {
				onCreate('folder', '');
			}}
		>▤</button>
	</header>
	<ExplorerSection
		name="Pinned"
		notes={pinned}
		{folded}
		{...rows}
	/>
	<ExplorerSection
		name="Recent"
		notes={recent}
		{folded}
		{...rows}
	/>
	<div class="tree">
		<ExplorerFolder
			folder={root}
			{folded}
			{onCreate}
			{...rows}
		/>
	</div>
</nav>

<style>
	.explorer {
		height: 100%;
		outline: none;
		overflow: auto;
		padding: 0.5rem 0.25rem;
		background: var(--surface);
	}

	header {
		display: flex;
		gap: 0.25rem;
		align-items: center;
		margin: 0 0.25rem 0.5rem 0.5rem;
	}

	h2 {
		flex: 1;
		overflow: hidden;
		margin: 0;
		color: var(--muted);
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.05em;
		text-overflow: ellipsis;
		text-transform: uppercase;
		white-space: nowrap;
	}

	header button {
		padding: 0 0.35rem;
		border: none;
		border-radius: 4px;
		background: none;
		color: var(--muted);
		font: inherit;
		cursor: pointer;
	}

	header button:hover {
		background: var(--hover);
		color: inherit;
	}
</style>
