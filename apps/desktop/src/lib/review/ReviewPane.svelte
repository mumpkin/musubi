<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- The review of flashcards, a pane mode of its own: the question, then
     the answer with `Enter`, then a rating from `1` (again) to `4` (easy).
     `Escape` or `q` goes back to reading. -->
<script lang="ts">
	import '../reading/note.css';

	import { onMount } from 'svelte';

	import { RATINGS } from '../vault/reviews.ts';
	import { ReviewSession } from './review-session.svelte.ts';

	interface Props {
		// `''` for the whole vault, a folder or a note.
		scope: string;
		autofocus: boolean;
		onClose: () => void;
	}

	const { scope, autofocus, onClose }: Props = $props();

	// svelte-ignore state_referenced_locally
	const session = new ReviewSession(scope);
	let element = $state<HTMLElement>();

	onMount(() => {
		session.load().catch(() => undefined);
		if (autofocus) {
			element?.focus();
		}
	});

	function rate(rating: number): void {
		session.rate(rating).catch((error: unknown) => {
			session.failure = String(error);
		});
	}

	const RATING_KEYS = new Set(['1', '2', '3', '4']);

	function handleKey(event: KeyboardEvent): void {
		if (event.ctrlKey || event.altKey || event.metaKey) {
			return;
		}
		if (event.key === 'Enter') {
			session.reveal();
		} else if (RATING_KEYS.has(event.key) && session.isRevealed) {
			rate(Number(event.key));
		} else if (event.key === 'Escape' || event.key === 'q') {
			onClose();
		} else {
			return;
		}
		event.preventDefault();
	}

	const scopeName = $derived(scope === '' ? 'the whole vault' : scope);
</script>

<svelte:head>
	<!-- Styles of the Typst HTML export (MathML layout). -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized -->
	{@html `<style>${session.sides?.styles ?? ''}</style>`}
</svelte:head>

<!-- Focusable so that its keys only reach this pane. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<section
	bind:this={element}
	class="review-view"
	tabindex="0"
	aria-label="Review of {scopeName}"
	onkeydown={handleKey}
>
	<p class="progress">
		Reviewing {scopeName} · {session.cards.length} due ·
		{session.reviewed} reviewed
	</p>
	{#if session.failure}
		<p class="message">{session.failure}</p>
	{:else if session.isLoading && !session.current}
		<p class="message">Loading…</p>
	{:else if !session.current || !session.sides}
		<div class="done">
			<p>Nothing to review now.</p>
			<button onclick={onClose}>Back to the note (Escape)</button>
		</div>
	{:else}
		<!-- The sides come sanitized from `toNoteMarkup`. -->
		<div class="card reading-view">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			<div class="face">{@html session.sides.front}</div>
			{#if session.isRevealed}
				<hr />
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				<div class="face">{@html session.sides.back}</div>
			{/if}
		</div>
		<p class="source">
			{session.current.note}{session.current.isReverse ? ' · reverse' : ''}
			{session.current.isNew ? ' · new' : ''}
		</p>
		{#if session.isRevealed}
			<div class="ratings">
				{#each RATINGS as rating (rating.value)}
					<button
						onclick={() => {
							rate(rating.value);
						}}
					>{rating.label} <kbd>{rating.value}</kbd></button>
				{/each}
			</div>
		{:else}
			<div class="ratings">
				<button
					onclick={() => {
						session.reveal();
					}}
				>Show the answer <kbd>Enter</kbd></button>
			</div>
		{/if}
	{/if}
</section>

<style>
	.review-view {
		overflow: auto;
		padding: 2rem 1.5rem;
		outline: none;
	}

	.progress,
	.source {
		max-width: 40rem;
		margin: 0 auto 1rem;
		color: var(--muted);
		font-size: 0.8rem;
	}

	.source {
		margin-top: 0.5rem;
	}

	.card {
		max-width: 40rem;
		margin: 0 auto;
		padding: 1.5rem 2rem;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--surface);
		font-size: 1.15rem;
		text-align: center;
	}

	hr {
		margin: 1.25rem 0;
		border: none;
		border-top: 1px dashed var(--border);
	}

	.ratings,
	.done {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		justify-content: center;
		max-width: 40rem;
		margin: 1.25rem auto 0;
	}

	.done {
		flex-direction: column;
		align-items: center;
		color: var(--muted);
	}

	button {
		padding: 0.35rem 0.9rem;
		border: 1px solid var(--border);
		border-radius: 4px;
		background: var(--background);
		color: inherit;
		font: inherit;
		cursor: pointer;
	}

	button:hover {
		background: var(--hover);
	}

	kbd {
		margin-left: 0.35rem;
		color: var(--muted);
		font-family: ui-monospace, monospace;
		font-size: 0.75rem;
	}

	.message {
		color: var(--muted);
		text-align: center;
	}
</style>
