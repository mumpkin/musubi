<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Side panel listing the notes of the vault by title. Folders fold; file
     paths only show in tooltips. -->
<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';

	import type { NoteEntry } from '../bindings/NoteEntry.ts';
	import type { TreeEditing } from '../tree-edit/tree-editing.svelte.ts';
	import TreeChangesDialog from '../tree-edit/TreeChangesDialog.svelte';
	import TreeEditor from '../tree-edit/TreeEditor.svelte';
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
		// The tree as text, edited as in oil.nvim.
		editing: TreeEditing;
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
		editing,
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
	let editor = $state<{ focus: () => void }>();

	// `Space h` / `Space l`: the focus goes to the current note, or to the
	// tree editor.
	export function focusList(): void {
		if (editing.isActive) {
			editor?.focus();
			return;
		}
		focusFirst(element, ITEMS, '.tree .note.current');
	}
</script>

<!-- `j`, `k`, `l` and `Escape` reach the panel from its entries. -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<nav
	bind:this={element}
	class="explorer"
	class:editing={editing.isActive}
	aria-label="Notes"
	tabindex="-1"
	onkeydown={(event) => {
		if (!editing.isActive) {
			const list = { container: element, selector: ITEMS, onLeave };
			listKeydown(event, list);
		}
	}}
>
	<header>
		<h2 title={vaultName}>{vaultName}</h2>
		<button
			title={editing.isActive
				? 'Back to the tree (:q)'
				: 'Edit the tree as text (Space r)'}
			aria-pressed={editing.isActive}
			onclick={() => {
				editing.toggle(rows.current);
			}}
		><Icon name={editing.isActive ? 'read' : 'edit'} /></button>
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
	{#if editing.isActive}
		{#key editing.tree}
			<div class="tree-text">
				<TreeEditor
					bind:this={editor}
					text={editing.tree.text}
					startLine={editing.startLine}
					onWrite={editing.write}
					onQuit={editing.quit}
					onChange={editing.changed}
					onOpenLine={editing.openLine}
					onModeChange={editing.modeChanged}
					onFocusChange={editing.focusChanged}
					onMessage={editing.message}
				/>
			</div>
		{/key}
	{:else}
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
	{/if}
</nav>

<TreeChangesDialog
	changes={editing.changes}
	onAnswer={editing.answerChanges}
/>

<style>
	.explorer {
		display: flex;
		flex-direction: column;
		height: 100%;
		outline: none;
		overflow: auto;
		padding: 0.5rem 0.25rem;
		background: var(--surface);
	}

	/* The tree editor scrolls by itself. */
	.explorer.editing {
		overflow: hidden;
	}

	.tree-text {
		flex: 1;
		min-height: 0;
	}

	header {
		flex: none;
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
