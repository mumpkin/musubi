<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Notes linking to the current one, from the index, with the sentence
     around each link. -->
<script lang="ts">
	import {
		type BacklinkGroup,
		backlinks,
		groupBacklinks,
	} from '../vault/links.ts';

	interface Props {
		// Path of the current note.
		path: string;
		// Bumped when the vault may have changed: the list is read again.
		revision: number;
		onOpen: (path: string) => void;
	}

	const { path, revision, onOpen }: Props = $props();

	let groups = $state<BacklinkGroup[]>([]);
	let failure = $state<string>();

	// The latest request: an older, slower answer must not replace it.
	let latest = 0;

	function load(notePath: string, version: number): void {
		latest += 1;
		const request = latest;
		backlinks(notePath)
			.then((links) => {
				if (request === latest && version === revision) {
					groups = groupBacklinks(links);
					failure = undefined;
				}
			})
			.catch((error: unknown) => {
				failure = String(error);
			});
	}

	$effect(() => {
		load(path, revision);
	});
</script>

<aside
	class="backlinks"
	aria-label="Backlinks"
>
	<h2>Backlinks</h2>
	{#if failure}
		<p class="empty">{failure}</p>
	{:else if groups.length === 0}
		<p class="empty">No note links here yet.</p>
	{/if}
	<ul>
		{#each groups as group (group.path)}
			<li>
				<button
					class="source"
					title={group.path}
					onclick={() => {
						onOpen(group.path);
					}}
				>
					{group.title}
				</button>
				{#each group.links as link, index (index)}
					<p class="context">
						{#each link.sections as section, position (position)}
							<span class="section">§ {section}</span>
						{/each}
						{link.context}
					</p>
				{/each}
			</li>
		{/each}
	</ul>
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

	.empty {
		margin: 0.25rem;
		color: var(--muted);
		font-size: 0.85rem;
	}

	ul {
		display: grid;
		gap: 0.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		padding: 0.4rem 0.5rem;
		border-radius: 6px;
		background: var(--background);
	}

	.source {
		padding: 0;
		border: none;
		background: none;
		color: var(--accent);
		font: inherit;
		font-size: 0.9rem;
		font-weight: 600;
		text-align: left;
		cursor: pointer;
	}

	.source:hover {
		text-decoration: underline;
	}

	.context {
		margin: 0.25rem 0 0;
		color: var(--muted);
		font-size: 0.8rem;
		line-height: 1.4;
	}

	.section {
		margin-right: 0.25rem;
		color: var(--foreground);
	}
</style>
