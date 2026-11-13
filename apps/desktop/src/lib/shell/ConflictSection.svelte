<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- The conflict copies that sync tools made, as a section of the
     explorer: a click compares a note with its copy. Hidden without
     conflicts. -->
<script lang="ts">
	import type { SvelteSet } from 'svelte/reactivity';

	import type { Conflict } from '../bindings/Conflict.ts';
	import ExplorerSection from './ExplorerSection.svelte';

	interface Props {
		folded: SvelteSet<string>;
		conflicts: Conflict[];
		onConflict: (conflict: Conflict) => void;
	}

	const { folded, conflicts, onConflict }: Props = $props();

	const nameOf = (path: string): string =>
		path.slice(path.lastIndexOf('/') + 1).replace(/\.typ$/u, '')
			.replaceAll('_', ' ');
</script>

{#if conflicts.length > 0}
	<ExplorerSection
		name="Conflicts"
		icon="conflict"
		{folded}
	>
		<ul>
			{#each conflicts as conflict (conflict.copy)}
				<li>
					<button
						class="note"
						title={`Compare ${conflict.note} with its ${conflict.tool} copy`}
						onclick={() => {
							onConflict(conflict);
						}}
					><span class="name">{nameOf(conflict.note)}</span>
						<span class="tool">{conflict.tool}</span></button>
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
		gap: 0.4rem;
		align-items: baseline;
		width: 100%;
		min-width: 0;
		padding: 0.2rem 0.5rem;
		border: none;
		border-radius: 4px;
		background: none;
		color: var(--error);
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
		min-width: 0;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.tool {
		flex: none;
		color: var(--muted);
		font-size: 0.75rem;
	}
</style>
