<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- The trash: deleted notes, newest first, to restore or delete for good.
     Deleting for good asks for a second click. -->
<script lang="ts">
	import { Dialog } from 'bits-ui';

	import type { TrashEntry } from '../bindings/TrashEntry.ts';
	import {
		deleteForGood,
		deletionTime,
		restoreNote,
		trashEntries,
	} from '../vault/trash.ts';

	interface Props {
		open: boolean;
		onRestored: (path: string) => void;
		onError: (message: string) => void;
	}

	let { open = $bindable(), onRestored, onError }: Props = $props();

	let entries = $state<TrashEntry[]>([]);
	// The entry, or `all`, waiting for the second click that deletes it.
	let confirming = $state<string>();

	function load(): void {
		trashEntries()
			.then((loaded) => {
				entries = loaded;
			})
			.catch((error: unknown) => {
				onError(String(error));
			});
	}

	$effect(() => {
		if (open) {
			confirming = undefined;
			load();
		}
	});

	function restore(entry: TrashEntry): void {
		restoreNote(entry.id)
			.then((path) => {
				open = false;
				onRestored(path);
			})
			.catch((error: unknown) => {
				onError(String(error));
			});
	}

	const notesLabel = (count: number): string =>
		count === 1 ? '1 note' : `${String(count)} notes`;

	// First click asks, second click deletes.
	function remove(id: string): void {
		if (confirming !== id) {
			confirming = id;
			return;
		}
		confirming = undefined;
		deleteForGood(id === 'all' ? undefined : id)
			.then(load)
			.catch((error: unknown) => {
				onError(String(error));
			});
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay class="palette-overlay" />
		<Dialog.Content
			class="palette"
			aria-label="Trash"
		>
			<header>
				<Dialog.Title class="trash-title">Trash</Dialog.Title>
				{#if entries.length > 0}
					<button
						class="danger"
						onclick={() => {
							remove('all');
						}}
					>
						{confirming === 'all'
							? `Delete ${String(entries.length)} for good?`
							: 'Empty the trash'}
					</button>
				{/if}
			</header>
			{#if entries.length === 0}
				<p class="empty">The trash is empty.</p>
			{/if}
			<ul>
				{#each entries as entry (entry.id)}
					<li>
						<div class="entry">
							<span>{entry.title}</span>
							<span class="detail">
								{entry.originalPath}{entry.isFolder
									? ` · folder, ${notesLabel(entry.noteCount)}`
									: ''} ·
								{deletionTime(entry.deletedAt)}
							</span>
						</div>
						<button
							onclick={() => {
								restore(entry);
							}}
						>Restore</button>
						<button
							class="danger"
							onclick={() => {
								remove(entry.id);
							}}
						>{confirming === entry.id ? 'Sure?' : 'Delete'}</button>
					</li>
				{/each}
			</ul>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--border);
	}

	:global(.trash-title) {
		margin: 0;
		font-size: 1rem;
	}

	ul {
		max-height: 50vh;
		overflow: auto;
		margin: 0;
		padding: 0.25rem;
		list-style: none;
	}

	li {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		padding: 0.4rem 0.75rem;
	}

	.entry {
		display: grid;
		flex: 1;
		min-width: 0;
	}

	.detail {
		overflow: hidden;
		color: var(--muted);
		font-size: 0.8rem;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	button {
		padding: 0.2rem 0.6rem;
		border: 1px solid var(--border);
		border-radius: 4px;
		background: var(--background);
		color: inherit;
		font: inherit;
		font-size: 0.85rem;
		cursor: pointer;
	}

	button:hover {
		background: var(--hover);
	}

	.danger {
		color: var(--error);
	}

	.empty {
		margin: 1rem;
		color: var(--muted);
	}
</style>
