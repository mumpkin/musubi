<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Notes linking to the current one, with the sentence around the link. -->
<script lang="ts">
	import { backlinksOf } from './mock-vault.ts';

	interface Props {
		current: string;
		onOpen: (path: string) => void;
	}

	const { current, onOpen }: Props = $props();

	const backlinks = $derived(backlinksOf(current));
</script>

<aside
	class="backlinks"
	aria-label="Backlinks"
>
	<h2>Backlinks <span class="count">{backlinks.length}</span></h2>
	{#each backlinks as backlink (backlink.path)}
		<button
			onclick={() => {
				onOpen(backlink.path);
			}}
		>
			<span class="title">{backlink.title}</span>
			<span class="excerpt">{backlink.excerpt}</span>
		</button>
	{:else}
		<p class="empty">No note links here yet.</p>
	{/each}
</aside>

<style>
	.backlinks {
		height: 100%;
		overflow: auto;
		padding: 0.5rem;
		background: var(--surface);
	}

	h2 {
		margin: 0.25rem 0.25rem 0.75rem;
		color: var(--muted);
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.count {
		padding: 0 0.35rem;
		border-radius: 8px;
		background: var(--hover);
	}

	button {
		display: grid;
		gap: 0.2rem;
		width: 100%;
		margin-bottom: 0.5rem;
		padding: 0.5rem;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--background);
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	button:hover {
		border-color: var(--accent);
	}

	.title {
		font-weight: 600;
		font-size: 0.9rem;
	}

	.excerpt,
	.empty {
		color: var(--muted);
		font-size: 0.85rem;
	}
</style>
