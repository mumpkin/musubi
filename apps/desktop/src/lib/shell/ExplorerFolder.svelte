<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- The content of one folder of the explorer: sub-folders, then notes.
     Actions on an entry are in its context menu: the rows carry its path
     and kind for it. Long names end with an ellipsis. -->
<script lang="ts">
	import type { SvelteSet } from 'svelte/reactivity';

	import type { FolderNode } from '../vault/tree.ts';
	import Self from './ExplorerFolder.svelte';
	import Icon from './Icon.svelte';

	interface Props {
		folder: FolderNode;
		current: string;
		folded: SvelteSet<string>;
		pinnedPaths: ReadonlySet<string>;
		onOpen: (path: string) => void;
	}

	const { folder, current, folded, pinnedPaths, onOpen }: Props = $props();

	function toggle(path: string): void {
		if (folded.has(path)) {
			folded.delete(path);
		} else {
			folded.add(path);
		}
	}
</script>

<ul>
	{#each folder.folders as child (child.path)}
		<li>
			<button
				class="folder"
				aria-expanded={!folded.has(child.path)}
				title={child.path}
				data-path={child.path}
				data-kind="folder"
				onclick={() => {
					toggle(child.path);
				}}
			>
				<span class="chevron">
					<Icon name={folded.has(child.path) ? 'folded' : 'unfolded'} />
				</span>
				<span class="name">{child.name}</span>
			</button>
			{#if !folded.has(child.path)}
				<Self
					folder={child}
					{current}
					{folded}
					{pinnedPaths}
					{onOpen}
				/>
			{/if}
		</li>
	{/each}
	{#each folder.notes as note (note.path)}
		<li>
			<button
				class="note"
				class:current={note.path === current}
				class:pinned={pinnedPaths.has(note.path)}
				title={note.path}
				data-path={note.path}
				data-kind="note"
				onclick={() => {
					onOpen(note.path);
				}}
			><span class="name">{note.title}</span></button>
		</li>
	{/each}
</ul>

<style>
	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	ul :global(ul) {
		padding-left: 1rem;
	}

	button {
		display: flex;
		align-items: center;
		width: 100%;
		min-width: 0;
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

	/* The entry reached with `j` and `k`. */
	button:focus-visible {
		outline: none;
		background: var(--hover);
		box-shadow: inset 2px 0 0 var(--accent);
	}

	/* A long name ends with an ellipsis instead of wrapping. */
	.name {
		overflow: hidden;
		min-width: 0;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.note.current {
		background: var(--selection);
	}

	.folder {
		gap: 0.15rem;
	}

	.chevron {
		display: grid;
		flex: none;
		place-items: center;
		width: 1rem;
		color: var(--muted);
	}
</style>
