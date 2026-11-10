<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- One pane: any note, in reading or editing mode. -->
<script lang="ts">
	import { type EditorMode, modeIndicator } from '@musubi/editor';

	import HelixEditor from '../editor/HelixEditor.svelte';
	import type { PaneAction } from './actions.ts';
	import { sourceOf, titleOf } from './mock-vault.ts';
	import PaneHeader from './PaneHeader.svelte';
	import type { PaneState } from './panes.ts';
	import ReadingPane from './ReadingPane.svelte';

	interface Props {
		pane: PaneState;
		isFocused: boolean;
		actions: PaneAction[];
		onFocus: () => void;
		onOpen: (path: string) => void;
		onMessage: (message: string) => void;
		onEditorMode: (mode: EditorMode) => void;
	}

	const {
		pane,
		isFocused,
		actions,
		onFocus,
		onOpen,
		onMessage,
		onEditorMode,
	}: Props = $props();

	let editorMode = $state<EditorMode>('normal');

	function setEditorMode(mode: EditorMode): void {
		editorMode = mode;
		onEditorMode(mode);
	}
</script>

<section
	class="pane"
	class:focused={isFocused}
	onfocusin={onFocus}
>
	<PaneHeader
		title={titleOf(pane.path)}
		mode={pane.mode === 'reading' ? 'LEC' : modeIndicator(editorMode)}
		{actions}
	/>
	{#if pane.mode === 'reading'}
		<ReadingPane
			path={pane.path}
			{onOpen}
		/>
	{:else}
		{#key pane.path}
			<HelixEditor
				text={sourceOf(pane.path)}
				onWrite={() => {
					onMessage(':w — saving comes with the vault');
				}}
				onQuit={() => {
					onMessage(':q — closing panes from the editor comes later');
				}}
				onModeChange={setEditorMode}
			/>
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

	.pane.focused {
		border-top-color: var(--accent);
	}
</style>
