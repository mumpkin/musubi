<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- A pane in editing mode. The editor lives as long as the note stays open
     in the pane: a rename by a new title or a reload from disk keeps it,
     and its undo history. -->
<script lang="ts">
	import type { EditorMode } from '@musubi/editor';
	import { untrack } from 'svelte';

	import HelixEditor from '../editor/HelixEditor.svelte';
	import { readNote } from '../vault/vault.ts';
	import type { PaneEvents, PaneState } from './panes.ts';

	interface Props {
		pane: PaneState;
		// Bumped when the note is saved or may have changed on disk.
		revision: number;
		autosaveDelay: number | undefined;
		autofocus: boolean;
		events: PaneEvents;
		onWrite: (text: string) => Promise<void>;
		onModeChange: (mode: EditorMode) => void;
	}

	const {
		pane,
		revision,
		autosaveDelay,
		autofocus,
		events,
		onWrite,
		onModeChange,
	}: Props = $props();

	// The note as saved on disk, for the opening `loads` of the pane.
	let disk = $state<{ loads: number; text: string }>();
	let failure = $state<string>();

	// Reads the note at each opening and each revision. The path is not
	// tracked: a rename comes with a new revision.
	$effect(() => {
		// Read to load the note again on a save or a reload.
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		revision;
		const opening = pane.loads;
		readNote(untrack(() => pane.path))
			.then((text) => {
				if (opening === pane.loads) {
					disk = { loads: opening, text };
					failure = undefined;
				}
			})
			.catch((error: unknown) => {
				failure = String(error);
			});
	});
</script>

{#if failure}
	<p class="message">{failure}</p>
{:else if disk?.loads === pane.loads}
	{#key pane.loads}
		<HelixEditor
			notePath={pane.path}
			text={pane.draft ?? disk.text}
			savedText={disk.text}
			{autosaveDelay}
			{autofocus}
			initialLine={pane.line}
			onCursorLine={events.line}
			{onWrite}
			onQuit={events.quit}
			onDraft={events.draft}
			onMessage={events.message}
			{onModeChange}
		/>
	{/key}
{:else}
	<p class="message">Loading…</p>
{/if}

<style>
	.message {
		margin: 2rem;
		color: var(--muted);
	}
</style>
