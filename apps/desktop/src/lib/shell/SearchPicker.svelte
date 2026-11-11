<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Picker of notes by title (`Space f`) or by text (`Space /`), as the
     file picker and global search of Helix. Results come ranked from the
     Rust core. -->
<script lang="ts">
	import { Command, Dialog } from 'bits-ui';

	import { search, type SearchKind, type SearchResult } from '../vault/search.ts';

	interface Props {
		// The kind of search shown, or `undefined` when closed.
		kind: SearchKind | undefined;
		onOpen: (path: string, line: number | undefined) => void;
	}

	let { kind = $bindable(), onOpen }: Props = $props();

	let query = $state('');
	let results = $state<SearchResult[]>([]);
	// The latest search: an older, slower answer must not replace it.
	let latest = 0;

	$effect(() => {
		if (kind === undefined) {
			query = '';
			results = [];
			return;
		}
		latest += 1;
		const request = latest;
		search(kind, query)
			.then((found) => {
				if (request === latest) {
					results = found;
				}
			})
			.catch(() => undefined);
	});

	function choose(result: SearchResult): void {
		kind = undefined;
		onOpen(result.path, result.line);
	}

	const PLACEHOLDERS: Record<SearchKind, string> = {
		titles: 'Find a note by title…',
		text: 'Search the text of the notes…',
	};
</script>

<Dialog.Root
	bind:open={() => kind !== undefined, (isOpen) => {
		if (!isOpen) {
			kind = undefined;
		}
	}}
>
	<Dialog.Portal>
		<Dialog.Overlay class="palette-overlay" />
		<Dialog.Content
			class="palette"
			aria-label="Search"
		>
			<Command.Root shouldFilter={false}>
				<Command.Input
					class="palette-input"
					placeholder={kind ? PLACEHOLDERS[kind] : ''}
					bind:value={query}
				/>
				<Command.List class="palette-list">
					<Command.Empty class="palette-empty">
						{kind === 'text' && query.trim() === ''
							? 'Type words to search.'
							: 'No match.'}
					</Command.Empty>
					{#each results as result, index (index)}
						<Command.Item
							class="search-result"
							value={String(index)}
							onSelect={() => {
								choose(result);
							}}
						>
							<span class="title">{result.title}</span>
							<span class="detail">
								{#each result.detail as part, at (at)}
									{#if part.isMatch}
										<mark>{part.text}</mark>
									{:else}
										{part.text}
									{/if}
								{/each}
							</span>
						</Command.Item>
					{/each}
				</Command.List>
			</Command.Root>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	:global(.search-result) {
		display: grid;
		gap: 0.1rem;
		padding: 0.4rem 0.75rem;
		border-radius: 4px;
		cursor: pointer;
	}

	:global(.search-result[data-selected]) {
		background: var(--selection);
	}

	.detail {
		overflow: hidden;
		color: var(--muted);
		font-size: 0.85rem;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	mark {
		border-radius: 2px;
		background: var(--selection);
		color: var(--foreground);
		font-weight: 600;
	}
</style>
