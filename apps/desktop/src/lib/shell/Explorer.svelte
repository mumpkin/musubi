<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Side panel listing the notes of the vault by title. Folders fold; file
     paths only show in tooltips. -->
<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';

	import type { FolderNode } from '../vault/tree.ts';
	import ExplorerFolder from './ExplorerFolder.svelte';

	interface Props {
		vaultName: string;
		root: FolderNode;
		current: string;
		onOpen: (path: string) => void;
		onCreate: (kind: 'note' | 'folder', folder: string) => void;
		onDelete: (path: string) => void;
	}

	const {
		vaultName,
		root,
		current,
		onOpen,
		onCreate,
		onDelete,
	}: Props = $props();

	// Folded folders, by path.
	const folded = new SvelteSet<string>();
</script>

<nav
	class="explorer"
	aria-label="Notes"
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
	<ExplorerFolder
		folder={root}
		{current}
		{folded}
		{onOpen}
		{onCreate}
		{onDelete}
	/>
</nav>

<style>
	.explorer {
		height: 100%;
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
