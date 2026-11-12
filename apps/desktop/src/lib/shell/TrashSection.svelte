<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- The trash as the last section of the explorer: each entry restores on
     click (or `Enter`); its delete button asks for a second click. Hidden
     when the trash is empty. -->
<script lang="ts">
	import type { SvelteSet } from 'svelte/reactivity';

	import type { TrashEntry } from '../bindings/TrashEntry.ts';
	import {
		deleteForGood,
		restoreNote,
		trashEntries,
	} from '../vault/trash.ts';
	import type { TrashActions } from './actions.ts';
	import ExplorerSection from './ExplorerSection.svelte';
	import Icon from './Icon.svelte';

	interface Props {
		folded: SvelteSet<string>;
		actions: TrashActions;
	}

	const { folded, actions }: Props = $props();

	let entries = $state<TrashEntry[]>([]);
	let confirming = $state<string>();

	$effect(() => {
		if (actions.revision >= 0) {
			trashEntries()
				.then((loaded) => {
					entries = loaded;
				})
				.catch((error: unknown) => {
					actions.onError(String(error));
				});
		}
	});

	function remove(id: string): void {
		if (confirming !== id) {
			confirming = id;
			return;
		}
		confirming = undefined;
		deleteForGood(id)
			.then(() => {
				entries = entries.filter((entry) => entry.id !== id);
			})
			.catch((error: unknown) => {
				actions.onError(String(error));
			});
	}
</script>

{#if entries.length > 0}
	<ExplorerSection
		name="Trash"
		icon="trash"
		{folded}
	>
		<ul>
			{#each entries as entry (entry.id)}
				<li class="row">
					<button
						class="note"
						title="Restore {entry.originalPath}"
						onclick={() => {
							actions.onRestored(restoreNote(entry.id));
						}}
					>{entry.isFolder ? `${entry.title}/` : entry.title}</button>
					<button
						class="add"
						class:confirming={confirming === entry.id}
						title={confirming === entry.id
							? 'Click again to delete for good'
							: `Delete ${entry.title} for good`}
						onclick={() => {
							remove(entry.id);
						}}
					><Icon name="close" /></button>
				</li>
			{/each}
		</ul>
	</ExplorerSection>
{/if}

<style>
	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.row {
		display: flex;
	}

	button {
		padding: 0.2rem 0.5rem;
		border: none;
		border-radius: 4px;
		background: none;
		color: var(--muted);
		font: inherit;
		font-size: 0.9rem;
		text-align: left;
		cursor: pointer;
	}

	.note {
		flex: 1;
	}

	button:hover,
	button:focus-visible {
		outline: none;
		background: var(--hover);
	}

	.add {
		display: flex;
		align-items: center;
		visibility: hidden;
	}

	.row:hover .add,
	.confirming {
		visibility: visible;
	}

	.confirming {
		color: var(--error);
	}
</style>
