<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- A section of the explorer (Recent, Pinned, Notebook…): a header with an
     icon that folds it like a folder, then its entries. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SvelteSet } from 'svelte/reactivity';

	import type { IconName } from './actions.ts';
	import { type DropFolder, dropFolder } from './drag-drop.ts';
	import Icon from './Icon.svelte';

	interface Props {
		name: string;
		icon: IconName;
		folded: SvelteSet<string>;
		children: Snippet;
		// Entries dropped on the header move into this folder.
		drop?: DropFolder | undefined;
	}

	const { name, icon, folded, children, drop }: Props = $props();

	// Folder paths never start with `/`: the key cannot clash with one.
	const key = $derived(`/${name}`);
	const isFolded = $derived(folded.has(key));
</script>

<section aria-label={name}>
	<button
		class="folder section-header"
		use:dropFolder={drop}
		aria-expanded={!isFolded}
		onclick={() => {
			if (isFolded) {
				folded.delete(key);
			} else {
				folded.add(key);
			}
		}}
	>
		<Icon name={isFolded ? 'folded' : 'unfolded'} />
		<Icon name={icon} />
		{name}
	</button>
	{#if !isFolded}
		<div class="entries">
			{@render children()}
		</div>
	{/if}
</section>

<style>
	section {
		margin-bottom: 0.5rem;
	}

	.entries {
		padding-left: 0.6rem;
	}

	.section-header {
		display: flex;
		gap: 0.3rem;
		align-items: center;
		width: 100%;
		padding: 0.2rem 0.5rem;
		border: none;
		border-radius: 4px;
		background: none;
		color: var(--muted);
		font: inherit;
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.05em;
		text-align: left;
		text-transform: uppercase;
		cursor: pointer;
	}

	/* Set by the drop action, out of sight of Svelte. */
	:global(.section-header[data-drop-target]) {
		background: var(--selection);
		box-shadow: inset 0 0 0 1px var(--accent);
	}

	.section-header:hover,
	.section-header:focus-visible {
		outline: none;
		background: var(--hover);
	}
</style>
