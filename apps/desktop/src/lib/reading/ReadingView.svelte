<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Native reading view: the HTML export of a note, styled by the app. -->
<script lang="ts">
	import type { NoteMarkup } from './note-html.ts';
	import { linkedNotePath } from './note-html.ts';

	interface Props {
		markup: NoteMarkup;
		onNavigate: (path: string) => void;
	}

	const { markup, onNavigate }: Props = $props();

	function handleClick(event: MouseEvent): void {
		if (!(event.target instanceof Element)) {
			return;
		}
		const anchor = event.target.closest('a');
		if (!anchor) {
			return;
		}
		// Links never open inside the window; web links will open in the
		// system browser later.
		event.preventDefault();
		const path = linkedNotePath(anchor);
		if (path !== undefined) {
			onNavigate(path);
		}
	}
</script>

<svelte:head>
	<!-- Styles of the Typst HTML export (MathML layout). -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized -->
	{@html `<style>${markup.styles}</style>`}
</svelte:head>

<!-- Clicks are delegated from the container; keyboard navigation of the
     reading view comes with the block cursor. -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<article
	class="reading-view"
	onclick={handleClick}
>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized -->
	{@html markup.body}
</article>

<style>
	.reading-view {
		max-width: 46rem;
		margin: 0 auto;
		padding: 2rem 1.5rem 4rem;
		line-height: 1.6;
	}

	.reading-view :global(h2) {
		margin-top: 0;
		font-size: 1.9rem;
	}

	.reading-view :global(h3) {
		margin-top: 2rem;
		font-size: 1.35rem;
	}

	.reading-view :global(math) {
		font-family: 'New Computer Modern Math', 'STIX Two Math', math;
	}

	.reading-view :global(math[display='block']) {
		margin: 1rem 0;
	}

	.reading-view :global(pre) {
		overflow-x: auto;
		padding: 0.75rem 1rem;
		border-radius: 6px;
		background: var(--surface);
	}

	.reading-view :global(code) {
		font-family: ui-monospace, 'DejaVu Sans Mono', monospace;
		font-size: 0.9em;
	}

	.reading-view :global(blockquote) {
		margin: 1rem 0;
		padding-left: 1rem;
		border-left: 3px solid var(--muted);
		color: var(--muted);
	}

	.reading-view :global(table) {
		border-collapse: collapse;
	}

	.reading-view :global(td) {
		padding: 0.3rem 0.8rem;
		border: 1px solid var(--border);
	}

	.reading-view :global(a.musubi-link) {
		color: var(--accent);
		text-decoration: none;
		cursor: pointer;
	}

	.reading-view :global(a.musubi-link:hover) {
		text-decoration: underline;
	}

	.reading-view :global(.musubi-card) {
		display: grid;
		gap: 0.4rem;
		margin: 0.75rem 0;
		padding: 0.6rem 0.9rem;
		border: 1px solid var(--border);
		border-radius: 6px;
	}

	.reading-view :global(.musubi-card-question) {
		font-weight: 600;
	}

	.reading-view :global(.musubi-card[data-reverse]::after) {
		content: '↔ both directions';
		font-size: 0.8em;
		color: var(--muted);
	}

	.reading-view :global(.musubi-task) {
		display: inline-flex;
		gap: 0.4rem;
		align-items: baseline;
	}

	.reading-view :global(.musubi-task[data-done='true']) {
		color: var(--muted);
		text-decoration: line-through;
	}
</style>
