<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Side panel listing the notes of the vault by title. Folders fold; file
     paths only show in tooltips. -->
<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';

	import type { NoteEntry } from '../bindings/NoteEntry.ts';
	import type { FolderNode } from '../vault/tree.ts';
	import type { TrashActions } from './actions.ts';
	import ExplorerFolder from './ExplorerFolder.svelte';
	import ExplorerSection from './ExplorerSection.svelte';
	import Icon from './Icon.svelte';
	import { focusFirst, listKeydown } from './list-keys.ts';
	import TrashSection from './TrashSection.svelte';

	interface Props {
		vaultName: string;
		root: FolderNode;
		archive: FolderNode | undefined;
		// Without it, the trash section is hidden (a setting).
		trash: TrashActions | undefined;
		pinned: NoteEntry[];
		recent: NoteEntry[];
		pinnedPaths: ReadonlySet<string>;
		current: string;
		onOpen: (path: string) => void;
		onPin: (path: string) => void;
		onArchive: (path: string) => void;
		onCreate: (kind: 'note' | 'folder', folder: string) => void;
		onDelete: (path: string) => void;
		// `Escape`: the focus goes back to the pane.
		onLeave: () => void;
	}

	const {
		vaultName,
		root,
		archive,
		trash,
		pinned,
		recent,
		onCreate,
		onLeave,
		...rows
	}: Props = $props();

	// The notes of a section, as a folder without sub-folders.
	function flat(notes: NoteEntry[]): FolderNode {
		return { name: '', path: '', folders: [], notes };
	}

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
		><Icon name="newNote" /></button>
		<button
			title="New folder"
			onclick={() => {
				onCreate('folder', '');
			}}
		><Icon name="newFolder" /></button>
	</header>
	{#if recent.length > 0}
		<ExplorerSection
			name="Recent"
			icon="recent"
			{folded}
		>
			<ExplorerFolder
				folder={flat(recent)}
				{folded}
				{...rows}
			/>
		</ExplorerSection>
	{/if}
	{#if pinned.length > 0}
		<ExplorerSection
			name="Pinned"
			icon="pin"
			{folded}
		>
			<ExplorerFolder
				folder={flat(pinned)}
				{folded}
				{...rows}
			/>
		</ExplorerSection>
	{/if}
	<ExplorerSection
		name="Notebook"
		icon="notebook"
		{folded}
	>
		<div class="tree">
			<ExplorerFolder
				folder={root}
				{folded}
				{onCreate}
				{...rows}
			/>
		</div>
	</ExplorerSection>
	{#if archive}
		<ExplorerSection
			name="Archive"
			icon="archive"
			{folded}
		>
			<ExplorerFolder
				folder={archive}
				{folded}
				{...rows}
			/>
		</ExplorerSection>
	{/if}
	{#if trash}
		<TrashSection
			{folded}
			actions={trash}
		/>
	{/if}
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
		display: grid;
		place-items: center;
		padding: 0.15rem 0.3rem;
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
