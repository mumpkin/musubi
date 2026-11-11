<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- One pane: any note, in reading or editing mode, or the graph. -->
<script lang="ts">
	import { type EditorMode, modeIndicator } from '@musubi/editor';

	import HelixEditor from '../editor/HelixEditor.svelte';
	import GraphView from '../graph/GraphView.svelte';
	import { readNote, writeNote } from '../vault/vault.ts';
	import type { PaneAction } from './actions.ts';
	import PaneHeader from './PaneHeader.svelte';
	import { MODE_LABELS, type PaneEvents, type PaneState } from './panes.ts';
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
		// Paths of the notes of the vault.
		notes: ReadonlySet<string>;
		events: PaneEvents;
	}

	const {
		pane,
		title,
		isFocused,
		actions,
		revision,
		autosaveDelay,
		notes,
		events,
	}: Props = $props();

	let editorMode = $state<EditorMode>('normal');

	const isModified = $derived(pane.draft !== undefined);

	function setEditorMode(mode: EditorMode): void {
		editorMode = mode;
		events.editorMode(mode);
	}

	// A click on a note of the graph shows it in this pane.
	function openFromGraph(path: string): void {
		events.open(path, '');
	}

	async function write(text: string): Promise<void> {
		const path = await writeNote(pane.path, text);
		events.saved(pane.path, path);
	}
</script>

<section
	class="pane"
	class:focused={isFocused}
	onfocusin={events.focus}
>
	<PaneHeader
		title={isModified ? `${title} ●` : title}
		mode={pane.mode === 'editing'
			? modeIndicator(editorMode)
			: MODE_LABELS[pane.mode]}
		{actions}
	/>
	{#if pane.mode === 'graph'}
		<GraphView
			autofocus={isFocused}
			current={pane.path}
			{notes}
			onOpen={openFromGraph}
		/>
	{:else if pane.mode === 'reading'}
		<ReadingPane
			path={pane.path}
			{revision}
			loads={pane.loads}
			line={pane.line}
			{notes}
			onOpen={events.open}
			onLine={events.line}
			onEdit={events.edit}
			{isFocused}
		/>
	{:else}
		{#key `${pane.path}:${String(pane.loads)}`}
			{#await readNote(pane.path)}
				<p class="message">Loading…</p>
			{:then saved}
				<HelixEditor
					notePath={pane.path}
					text={pane.draft ?? saved}
					savedText={saved}
					{autosaveDelay}
					autofocus={isFocused}
					initialLine={pane.line}
					onCursorLine={events.line}
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
