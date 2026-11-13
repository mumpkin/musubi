<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- One pane: any note, in reading or editing mode, or the graph. -->
<script lang="ts">
	import { type EditorMode, modeIndicator } from '@musubi/editor';

	import GraphView from '../graph/GraphView.svelte';
	import ReviewPane from '../review/ReviewPane.svelte';
	import { writeNote } from '../vault/vault.ts';
	import type { PaneAction } from './actions.ts';
	import EditingPane from './EditingPane.svelte';
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
		// Flashcards of the note due now.
		dueCount: number;
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
		dueCount,
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
	onfocusin={events.focus}
>
	<PaneHeader
		title={pane.mode === 'review' ? 'Flashcards' : title}
		{isModified}
		mode={pane.mode === 'editing'
			? modeIndicator(editorMode)
			: MODE_LABELS[pane.mode]}
		{actions}
		{dueCount}
		onReview={events.review}
	/>
	{#if pane.mode === 'graph'}
		<GraphView
			autofocus={isFocused}
			current={pane.path}
			{notes}
			onOpen={openFromGraph}
		/>
	{:else if pane.mode === 'review'}
		{#key pane.scope}
			<ReviewPane
				scope={pane.scope ?? ''}
				autofocus={isFocused}
				onClose={events.read}
			/>
		{/key}
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
		<EditingPane
			{pane}
			{revision}
			{autosaveDelay}
			autofocus={isFocused}
			{events}
			onWrite={write}
			onModeChange={setEditorMode}
		/>
	{/if}
</section>

<style>
	.pane {
		display: grid;
		grid-template-rows: auto 1fr;
		height: 100%;
		min-height: 0;
	}
</style>
