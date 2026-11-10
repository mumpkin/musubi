<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- One pane: any note, in reading or editing mode. -->
<script lang="ts">
	import { type EditorMode, modeIndicator } from '@musubi/editor';

	import HelixEditor from '../editor/HelixEditor.svelte';
	import { readNote, writeNote } from '../vault/vault.ts';
	import type { PaneAction } from './actions.ts';
	import PaneHeader from './PaneHeader.svelte';
	import type { PaneEvents, PaneState } from './panes.ts';
	import ReadingPane from './ReadingPane.svelte';

	interface Props {
		pane: PaneState;
		title: string;
		isFocused: boolean;
		actions: PaneAction[];
		// Bumped when the note is saved, to render it again.
		revision: number;
		// Seconds of pause before saving, or `undefined` without autosave.
		autosaveDelay: number | undefined;
		events: PaneEvents;
	}

	const {
		pane,
		title,
		isFocused,
		actions,
		revision,
		autosaveDelay,
		events,
	}: Props = $props();

	let editorMode = $state<EditorMode>('normal');

	const isModified = $derived(pane.draft !== undefined);

	function setEditorMode(mode: EditorMode): void {
		editorMode = mode;
		events.editorMode(mode);
	}

	async function write(text: string): Promise<void> {
		await writeNote(pane.path, text);
		events.saved(pane.path);
	}
</script>

<section
	class="pane"
	class:focused={isFocused}
	onfocusin={events.focus}
>
	<PaneHeader
		title={isModified ? `${title} ●` : title}
		mode={pane.mode === 'reading' ? 'LEC' : modeIndicator(editorMode)}
		{actions}
	/>
	{#if pane.mode === 'reading'}
		<ReadingPane
			path={pane.path}
			{revision}
			onOpen={events.open}
		/>
	{:else}
		{#key `${pane.path}:${String(pane.loads)}`}
			{#await readNote(pane.path)}
				<p class="message">Loading…</p>
			{:then saved}
				<HelixEditor
					text={pane.draft ?? saved}
					savedText={saved}
					{autosaveDelay}
					autofocus={isFocused}
					onWrite={write}
					onQuit={events.quit}
					onDraft={events.draft}
					onMessage={events.message}
					onModeChange={setEditorMode}
				/>
			{:catch error}
				<p class="message">{String(error)}</p>
			{/await}
		{/key}
	{/if}
</section>

<style>
	.pane {
		display: grid;
		grid-template-rows: auto 1fr;
		height: 100%;
		min-height: 0;
		border-top: 2px solid transparent;
	}

	.message {
		margin: 2rem;
		color: var(--muted);
	}

	.pane.focused {
		border-top-color: var(--accent);
	}
</style>
