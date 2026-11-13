<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- A note and the conflict copy a sync tool made of it, side by side, the
     lines that differ marked. `1` keeps this version, `2` the other one,
     `m` merges by hand, `Escape` goes back to reading. -->
<script lang="ts">
	import { onMount } from 'svelte';

	import { resolveConflict } from '../vault/conflicts.ts';
	import { readNote } from '../vault/vault.ts';
	import { type DiffLine, lineDiff, toolOf } from './line-diff.ts';

	interface Props {
		note: string;
		copy: string;
		autofocus: boolean;
		onResolved: () => void;
		onMerge: () => void;
		onClose: () => void;
		onError: (message: string) => void;
	}

	const {
		note,
		copy,
		autofocus,
		onResolved,
		onMerge,
		onClose,
		onError,
	}: Props = $props();

	let lines = $state<DiffLine[]>([]);
	let element = $state<HTMLElement>();

	const tool = $derived(toolOf(copy));

	onMount(() => {
		Promise.all([readNote(note).catch(() => ''), readNote(copy)])
			.then(([mine, theirs]) => {
				lines = lineDiff(mine, theirs);
			})
			.catch((error: unknown) => {
				onError(String(error));
			});
		if (autofocus) {
			element?.focus();
		}
	});

	function keep(version: 'note' | 'copy'): void {
		resolveConflict(copy, version)
			.then(onResolved)
			.catch((error: unknown) => {
				onError(String(error));
			});
	}

	const KEYS = new Map<string, () => void>([
		['1', () => {
			keep('note');
		}],
		['2', () => {
			keep('copy');
		}],
		['m', () => {
			onMerge();
		}],
		['Escape', () => {
			onClose();
		}],
		['q', () => {
			onClose();
		}],
	]);

	function handleKey(event: KeyboardEvent): void {
		const action = KEYS.get(event.key);
		if (action && !event.ctrlKey && !event.altKey) {
			event.preventDefault();
			action();
		}
	}
</script>

<!-- Focusable so that its keys only reach this pane. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<section
	bind:this={element}
	class="conflict-view"
	tabindex="0"
	aria-label="Versions of {note}"
	onkeydown={handleKey}
>
	<p class="intro">
		{tool} kept two versions of this note, changed on two devices at once.
		Keep one; the other goes to the trash.
	</p>
	<div class="actions">
		<button
			onclick={() => {
				keep('note');
			}}
		>Keep this version <kbd>1</kbd></button>
		<button
			onclick={() => {
				keep('copy');
			}}
		>Keep the other one <kbd>2</kbd></button>
		<button onclick={onMerge}>Merge by hand <kbd>m</kbd></button>
	</div>
	<div class="columns">
		<div class="column">
			<h3>This version <span>{note}</span></h3>
			<pre>{#each lines as line, index (index)}{#if line.kind !== 'theirs'}<span
				class="line"
				class:changed={line.kind === 'mine'}
			>{line.text || ' '}</span>{/if}{/each}</pre>
		</div>
		<div class="column">
			<h3>The other one <span>{copy}</span></h3>
			<pre>{#each lines as line, index (index)}{#if line.kind !== 'mine'}<span
				class="line"
				class:changed={line.kind === 'theirs'}
			>{line.text || ' '}</span>{/if}{/each}</pre>
		</div>
	</div>
</section>

<style>
	.conflict-view {
		overflow: auto;
		padding: 1rem 1.25rem;
		outline: none;
	}

	.intro {
		margin: 0 0 0.75rem;
		color: var(--muted);
		font-size: 0.9rem;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	button {
		padding: 0.3rem 0.8rem;
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
		margin-left: 0.3rem;
		color: var(--muted);
		font-family: ui-monospace, monospace;
		font-size: 0.75rem;
	}

	.columns {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.column {
		min-width: 0;
	}

	h3 {
		margin: 0 0 0.5rem;
		font-size: 0.85rem;
	}

	h3 span {
		margin-left: 0.4rem;
		color: var(--muted);
		font-weight: normal;
		word-break: break-all;
	}

	pre {
		overflow: auto;
		margin: 0;
		padding: 0.5rem;
		border: 1px solid var(--border);
		border-radius: 6px;
		font-family: ui-monospace, 'DejaVu Sans Mono', monospace;
		font-size: 0.82rem;
		white-space: pre-wrap;
	}

	.line {
		display: block;
	}

	.changed {
		background: var(--mark);
	}
</style>
