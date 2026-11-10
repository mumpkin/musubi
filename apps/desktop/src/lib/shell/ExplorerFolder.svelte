<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- The content of one folder of the explorer: sub-folders, then notes. -->
<script lang="ts">
	import type { SvelteSet } from 'svelte/reactivity';

	import type { FolderNode } from '../vault/tree.ts';
	import Self from './ExplorerFolder.svelte';

	interface Props {
		folder: FolderNode;
		current: string;
		folded: SvelteSet<string>;
		onOpen: (path: string) => void;
		onCreate: (kind: 'note' | 'folder', folder: string) => void;
	}

	const { folder, current, folded, onOpen, onCreate }: Props = $props();

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
			<div class="row">
				<button
					class="folder"
					aria-expanded={!folded.has(child.path)}
					title={child.path}
					onclick={() => {
						toggle(child.path);
					}}
				>
					<span class="chevron">{folded.has(child.path) ? '▸' : '▾'}</span>
					{child.name}
				</button>
				<button
					class="add"
					title="New note in {child.name}"
					onclick={() => {
						onCreate('note', child.path);
					}}
				>+</button>
			</div>
			{#if !folded.has(child.path)}
				<Self
					folder={child}
					{current}
					{folded}
					{onOpen}
					{onCreate}
				/>
			{/if}
		</li>
	{/each}
	{#each folder.notes as note (note.path)}
		<li>
			<button
				class="note"
				class:current={note.path === current}
				title={note.path}
				onclick={() => {
					onOpen(note.path);
				}}
			>{note.title}</button>
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

	.row {
		display: flex;
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

	.add {
		width: auto;
		color: var(--muted);
		visibility: hidden;
	}

	.row:hover .add {
		visibility: visible;
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
