<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- The trash as the last section of the explorer: each entry restores on
     click (or `Enter`); its context menu restores it or deletes it for
     good, after a second click. Hidden when the trash is empty. -->
<script lang="ts">
	import type { SvelteSet } from 'svelte/reactivity';

	import type { TrashEntry } from '../bindings/TrashEntry.ts';
	import {
		deleteForGood,
		restoreNote,
		trashEntries,
	} from '../vault/trash.ts';
	import type { TrashActions } from './actions.ts';
	import { isMenuKey, type MenuItem } from './explorer-menu.ts';
	import ExplorerSection from './ExplorerSection.svelte';

	interface Props {
		folded: SvelteSet<string>;
		actions: TrashActions;
		onMenu: (event: Event, items: MenuItem[], origin: HTMLElement) => void;
	}

	const { folded, actions, onMenu }: Props = $props();

	let entries = $state<TrashEntry[]>([]);

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
		deleteForGood(id)
			.then(() => {
				entries = entries.filter((entry) => entry.id !== id);
			})
			.catch((error: unknown) => {
				actions.onError(String(error));
			});
	}

	function menuOf(entry: TrashEntry): MenuItem[] {
		return [
			{
				label: 'Restore',
				icon: 'unarchive',
				run: () => {
					actions.onRestored(restoreNote(entry.id));
				},
			},
			{
				label: 'Delete for good',
				icon: 'close',
				confirmation: 'Click again to delete for good',
				run: () => {
					remove(entry.id);
				},
			},
		];
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
				<li>
					<button
						class="note"
						title="Restore {entry.originalPath}"
						onclick={() => {
							actions.onRestored(restoreNote(entry.id));
						}}
						oncontextmenu={(event) => {
							onMenu(event, menuOf(entry), event.currentTarget);
						}}
						onkeydown={(event) => {
							const row = event.currentTarget;
							if (isMenuKey(event)) {
								onMenu(event, menuOf(entry), row);
							}
						}}
					><span class="name">
						{entry.isFolder ? `${entry.title}/` : entry.title}
					</span></button>
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

	button {
		display: flex;
		width: 100%;
		min-width: 0;
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

	button:hover,
	button:focus-visible {
		outline: none;
		background: var(--hover);
	}

	.name {
		overflow: hidden;
		/* Room for the descenders (g, p, y) the overflow would cut. */
		padding-block: 0.1em;
		line-height: 1.35;
		min-width: 0;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
