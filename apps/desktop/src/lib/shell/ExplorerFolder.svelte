<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- The content of one folder of the explorer: sub-folders, then notes. -->
<script lang="ts">
	import type { SvelteSet } from 'svelte/reactivity';

	import type { FolderNode } from '../vault/tree.ts';
	import Self from './ExplorerFolder.svelte';
	import Icon from './Icon.svelte';
	import PinButton from './PinButton.svelte';

	interface Props {
		folder: FolderNode;
		current: string;
		folded: SvelteSet<string>;
		pinnedPaths: ReadonlySet<string>;
		onOpen: (path: string) => void;
		onPin: (path: string) => void;
		// Without it, as in the pinned and recent sections, folders have no
		// button to create a note.
		onCreate?: ((kind: 'note' | 'folder', folder: string) => void)
			| undefined;
		onDelete: (path: string) => void;
	}

	const {
		folder,
		current,
		folded,
		pinnedPaths,
		onOpen,
		onPin,
		onCreate,
		onDelete,
	}: Props = $props();

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
					<span class="chevron">
						<Icon name={folded.has(child.path) ? 'folded' : 'unfolded'} />
					</span>
					{child.name}
				</button>
				{#if onCreate}
					<button
						class="add"
						title="New note in {child.name}"
						onclick={() => {
							onCreate('note', child.path);
						}}
					><Icon name="newNote" /></button>
				{/if}
			</div>
			{#if !folded.has(child.path)}
				<Self
					folder={child}
					{current}
					{folded}
					{pinnedPaths}
					{onOpen}
					{onPin}
					{onCreate}
					{onDelete}
				/>
			{/if}
		</li>
	{/each}
	{#each folder.notes as note (note.path)}
		<li class="row">
			<button
				class="note"
				class:current={note.path === current}
				title={note.path}
				onclick={() => {
					onOpen(note.path);
				}}
			>{note.title}</button>
			<PinButton
				{note}
				isPinned={pinnedPaths.has(note.path)}
				{onPin}
			/>
			<button
				class="add"
				title="Move {note.title} to the trash"
				onclick={() => {
					onDelete(note.path);
				}}
			><Icon name="trash" /></button>
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

	.row :global(button) {
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

	.row :global(button:hover) {
		background: var(--hover);
	}

	/* The entry reached with `j` and `k`. */
	.row :global(button:focus-visible) {
		outline: none;
		background: var(--hover);
		box-shadow: inset 2px 0 0 var(--accent);
	}

	.row :global(.add) {
		display: flex;
		align-items: center;
		width: auto;
		color: var(--muted);
		visibility: hidden;
	}

	.row:hover :global(.add) {
		visibility: visible;
	}

	.note.current {
		background: var(--selection);
	}

	/* More specific than the button rule above, which would make it a
	block. */
	.row .folder {
		display: flex;
		gap: 0.15rem;
		align-items: center;
	}

	.chevron {
		display: grid;
		place-items: center;
		width: 1rem;
		color: var(--muted);
	}
</style>
