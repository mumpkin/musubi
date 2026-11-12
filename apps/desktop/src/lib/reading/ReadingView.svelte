<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Native reading view: the HTML export of a note, styled by the app. -->
<script lang="ts">
	import './note.css';

	import { openUrl } from '@tauri-apps/plugin-opener';
	import { onDestroy } from 'svelte';

	import { PROMPT_LABELS } from '../editor/prompt.ts';
	import PromptLine from '../editor/PromptLine.svelte';
	import {
		blockAt,
		type BlockScroll,
		highlightBlock,
		renderedBlocks,
	} from './block-cursor.ts';
	import { LinkCursor } from './link-cursor.ts';
	import type { NoteMarkup } from './note-html.ts';
	import { linkedNotePath, webLinkUrl } from './note-html.ts';
	import { readingKeyHandler } from './reading-keys.ts';
	import { ReadingNavigator } from './reading-navigator.ts';

	interface Props {
		markup: NoteMarkup;
		// Source lines of the blocks, by index.
		sourceBlocks: readonly { startLine: number; endLine: number }[];
		// Index of the block under the cursor, in the source blocks.
		selectedBlock: number | undefined;
		// Scrolls the selection into view without animation, for the first
		// display of a note.
		isFirstDisplay?: boolean;
		// A note link was followed; `text` is the text of the link.
		onNavigate: (path: string, text: string) => void;
		onSelect: (block: number | undefined) => void;
		// Double click on a block: edit the note there.
		onEdit: (block: number) => void;
		// The pane has the focus: the view takes the keyboard once shown.
		autofocus?: boolean;
	}

	const {
		markup,
		sourceBlocks,
		selectedBlock,
		isFirstDisplay = false,
		onNavigate,
		onSelect,
		onEdit,
		autofocus = false,
	}: Props = $props();

	let container = $state<HTMLElement>();
	let prompt = $state<'search' | 'reverseSearch'>();
	// How the next selection scrolls; the navigator scrolls by itself.
	let nextScroll: BlockScroll = 'smooth';

	$effect(() => {
		if (container) {
			const scroll = isFirstDisplay ? 'instant' : nextScroll;
			highlightBlock(container, selectedBlock, scroll);
			nextScroll = 'smooth';
		}
	});

	function navigatorFor(root: HTMLElement): ReadingNavigator {
		return new ReadingNavigator({
			container: root,
			scroller: root.parentElement ?? root,
			blocks: () => renderedBlocks(root),
			sourceBlocks: () => sourceBlocks,
			selected: () => selectedBlock,
			select: (block, scroll) => {
				nextScroll = scroll ? 'smooth' : 'none';
				onSelect(block);
			},
			openPrompt: (kind) => {
				prompt = kind;
			},
		});
	}

	const navigator = $derived(container ? navigatorFor(container) : undefined);

	// The view appears after the note is compiled, later than the pane:
	// it takes the focus itself, so that `j` and `k` work at once.
	$effect(() => {
		const hasFocus = container?.contains(document.activeElement) ?? false;
		if (container && autofocus && !hasFocus) {
			container.focus({ preventScroll: true });
		}
	});

	onDestroy(() => {
		navigator?.clear();
	});

	// Helix navigation keys; `Escape` hides the cursor and the matches.
	const links = new LinkCursor(() => container);
	const handleKeydown = readingKeyHandler(() => navigator, () => {
		navigator?.clear();
		onSelect(undefined);
	}, links);

	// Footnotes and the outline link to elements of the note: they scroll
	// there smoothly.
	function scrollToAnchor(anchor: HTMLAnchorElement): boolean {
		const href = anchor.getAttribute('href') ?? '';
		if (!href.startsWith('#') || !container) {
			return false;
		}
		const id = CSS.escape(decodeURIComponent(href.slice(1)));
		container.querySelector(`#${id}`)
			?.scrollIntoView({ block: 'center', behavior: 'smooth' });
		return true;
	}

	function closePrompt(): void {
		prompt = undefined;
		container?.focus();
	}

	function submitSearch(text: string): void {
		const isForward = prompt === 'search';
		closePrompt();
		navigator?.search(text, isForward);
	}

	function handleDoubleClick(event: MouseEvent): void {
		const block = event.target instanceof Element
			? blockAt(event.target)
			: undefined;
		if (block !== undefined) {
			onEdit(block);
		}
	}

	function handleClick(event: MouseEvent): void {
		if (!(event.target instanceof Element)) {
			return;
		}
		const anchor = event.target.closest('a');
		if (!anchor) {
			onSelect(blockAt(event.target));
			return;
		}
		// Links never open inside the window: web links open in the system
		// browser.
		event.preventDefault();
		if (scrollToAnchor(anchor)) {
			return;
		}
		const url = webLinkUrl(anchor);
		if (url !== undefined) {
			openUrl(url).catch(() => undefined);
			return;
		}
		const path = linkedNotePath(anchor);
		if (path !== undefined) {
			onNavigate(path, anchor.textContent);
		}
	}
</script>

<svelte:head>
	<!-- Styles of the Typst HTML export (MathML layout). -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized -->
	{@html `<style>${markup.styles}</style>`}
</svelte:head>

<!-- Focusable so that keys only reach the pane that has the focus; clicks
     are delegated from the container. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<article
	bind:this={container}
	class="reading-view"
	tabindex="0"
	onclick={handleClick}
	ondblclick={handleDoubleClick}
	onkeydown={handleKeydown}
>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized -->
	{@html markup.body}
</article>
{#if prompt}
	<PromptLine
		label={PROMPT_LABELS[prompt]}
		onSubmit={submitSearch}
		onCancel={closePrompt}
	/>
{/if}

<style>
	.reading-view:focus {
		outline: none;
	}

	.reading-view {
		max-width: 46rem;
		margin: 0 auto;
		padding: 2rem 1.5rem 4rem;
		line-height: 1.6;
	}

	:global(::highlight(musubi-search)) {
		background: var(--selection);
	}

	:global(::highlight(musubi-search-current)) {
		background: var(--accent);
		color: var(--background);
	}
</style>
