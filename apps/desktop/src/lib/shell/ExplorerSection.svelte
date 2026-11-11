<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- A flat section at the top of the explorer (pinned or recent notes). It
     folds like a folder and is hidden when empty. -->
<script lang="ts">
	import type { SvelteSet } from 'svelte/reactivity';

	import type { NoteEntry } from '../bindings/NoteEntry.ts';
	import ExplorerFolder from './ExplorerFolder.svelte';

	interface Props {
		name: string;
		notes: NoteEntry[];
		current: string;
		folded: SvelteSet<string>;
		pinnedPaths: ReadonlySet<string>;
		onOpen: (path: string) => void;
		onPin: (path: string) => void;
		onDelete: (path: string) => void;
	}

	const { name, notes, ...rest }: Props = $props();

	// Folder paths never start with `/`: the key cannot clash with one.
	const folder = $derived({
		name,
		path: `/${name}`,
		folders: [],
		notes,
	});
</script>

{#if notes.length > 0}
	<section aria-label={name}>
		<ExplorerFolder
			folder={{ name: '', path: '', folders: [folder], notes: [] }}
			{...rest}
		/>
	</section>
{/if}

<style>
	section {
		margin-bottom: 0.5rem;
	}

	/* The name of the section, set apart from the folders. */
	section :global(.folder) {
		color: var(--muted);
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}
</style>
