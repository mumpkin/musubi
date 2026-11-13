<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- The header of the explorer: the vault name, the mode of the tree
     editor while it is open, and buttons to edit the tree as text and to
     create a note or a folder at the root. -->
<script lang="ts">
	import type { TreeEditing } from '../tree-edit/tree-editing.svelte.ts';
	import Icon from './Icon.svelte';
	import ModeBadge from './ModeBadge.svelte';

	interface Props {
		vaultName: string;
		// The note of the focused pane: the tree editor starts on it.
		current: string;
		editing: TreeEditing;
		onCreate: (kind: 'note' | 'folder', folder: string) => void;
		// Flashcards due in the vault; a click reviews them.
		dueCount: number;
		onReview: (scope: string) => void;
	}

	const {
		vaultName,
		current,
		editing,
		onCreate,
		dueCount,
		onReview,
	}: Props = $props();
</script>

<header>
	<h2 title={vaultName}>{vaultName}</h2>
	{#if editing.isActive}
		<ModeBadge mode={editing.modeLabel} />
	{:else if dueCount > 0}
		<button
			class="due"
			title="{dueCount} flashcards to review (Space c)"
			onclick={() => {
				onReview('');
			}}
		><Icon name="cards" />{dueCount}</button>
	{/if}
	<button
		title={editing.isActive
			? 'Back to the tree (:q)'
			: 'Edit the tree as text (Space r)'}
		aria-pressed={editing.isActive}
		onclick={() => {
			editing.toggle(current);
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

<style>
	header {
		display: flex;
		flex: none;
		gap: 0.25rem;
		align-items: center;
		margin: 0 0.25rem 0.5rem;
		padding: 0.15rem 0.25rem 0.15rem 0.5rem;
		border-radius: 4px;
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

	button {
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

	.due {
		display: flex;
		gap: 0.2rem;
		align-items: center;
		color: var(--accent);
		font-size: 0.75rem;
		font-weight: 600;
	}

	button:hover {
		background: var(--hover);
		color: inherit;
	}
</style>
