<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Interface mockup: title bar, explorer, one or two panes (each reading or
     editing any note), backlinks, status bar and command palette. Panes
     resize and fold with PaneForge. -->
<script lang="ts">
	import { type EditorMode, modeIndicator } from '@musubi/editor';
	import { Tooltip } from 'bits-ui';
	import { Pane, type PaneAPI, PaneGroup, PaneResizer } from 'paneforge';

	import type { PaletteCommand, PaneAction } from './actions.ts';
	import BacklinksPanel from './BacklinksPanel.svelte';
	import CommandPalette from './CommandPalette.svelte';
	import Explorer from './Explorer.svelte';
	import { PANE_SIZES, TOOLTIP_DELAY_MILLISECONDS } from './layout.ts';
	import { FOLDERS, ROOT_NOTES, titleOf } from './mock-vault.ts';
	import NotePane from './NotePane.svelte';
	import { MAX_PANES, otherMode, type PaneState } from './panes.ts';
	import StatusBar from './StatusBar.svelte';
	import TitleBar from './TitleBar.svelte';

	let panes = $state<PaneState[]>([{ path: 'Demo.typ', mode: 'reading' }]);
	let focusedIndex = $state(0);
	let editorMode = $state<EditorMode>('normal');
	let isPaletteOpen = $state(false);
	let message = $state('');
	let explorer = $state<PaneAPI>();
	let backlinks = $state<PaneAPI>();

	const focusedPane = $derived(panes[focusedIndex] ?? panes[0]);
	const currentPath = $derived(focusedPane?.path ?? '');
	const statusMode = $derived(
		focusedPane?.mode === 'editing' ? modeIndicator(editorMode) : 'LEC',
	);

	function open(path: string): void {
		const pane = panes[focusedIndex];
		if (pane) {
			pane.path = path;
		}
	}

	function toggleMode(index: number): void {
		const pane = panes[index];
		if (pane) {
			pane.mode = otherMode(pane.mode);
			editorMode = 'normal';
		}
	}

	// A second pane, on the same note in the other mode.
	function split(): void {
		const pane = panes[focusedIndex];
		if (pane && panes.length < MAX_PANES) {
			panes.push({ path: pane.path, mode: otherMode(pane.mode) });
			focusedIndex = panes.length - 1;
		}
	}

	function close(index: number): void {
		if (panes.length > 1) {
			panes.splice(index, 1);
			focusedIndex = 0;
		}
	}

	function toggle(pane: PaneAPI | undefined): void {
		if (pane?.isCollapsed()) {
			pane.expand();
		} else {
			pane?.collapse();
		}
	}

	function setEditorMode(mode: EditorMode): void {
		editorMode = mode;
	}

	function setMessage(text: string): void {
		message = text;
	}

	function actionsOf(index: number, pane: PaneState): PaneAction[] {
		const actions: PaneAction[] = [{
			label: pane.mode === 'reading' ? 'Edit this note' : 'Read this note',
			icon: pane.mode === 'reading' ? '✎' : '◧',
			run: () => {
				toggleMode(index);
			},
		}];
		if (panes.length < MAX_PANES) {
			actions.push({ label: 'Split the pane', icon: '⊞', run: split });
		} else {
			actions.push({
				label: 'Close this pane',
				icon: '✕',
				run: () => {
					close(index);
				},
			});
		}
		return actions;
	}

	const notes = [...ROOT_NOTES, ...FOLDERS.flatMap((folder) => folder.notes)];

	const commands: PaletteCommand[] = [
		{
			label: 'Switch between reading and editing',
			group: 'Pane',
			run: () => {
				toggleMode(focusedIndex);
			},
		},
		{ label: 'Split the pane', group: 'Pane', run: split },
		{
			label: 'Close the pane',
			group: 'Pane',
			run: () => {
				close(focusedIndex);
			},
		},
		{
			label: 'Toggle the note explorer',
			group: 'View',
			shortcut: 'Ctrl+B',
			run: () => {
				toggle(explorer);
			},
		},
		{
			label: 'Toggle backlinks',
			group: 'View',
			shortcut: 'Ctrl+L',
			run: () => {
				toggle(backlinks);
			},
		},
		...notes.map((note) => ({
			label: note.title,
			group: 'Open a note',
			run: () => {
				open(note.path);
			},
		})),
	];

	const SHORTCUTS = new Map<string, () => void>([
		['p', () => {
			isPaletteOpen = true;
		}],
		['b', () => {
			toggle(explorer);
		}],
		['l', () => {
			toggle(backlinks);
		}],
	]);

	function handleShortcut(event: KeyboardEvent): void {
		const action = event.ctrlKey ? SHORTCUTS.get(event.key) : undefined;
		if (action) {
			event.preventDefault();
			action();
		}
	}
</script>

<svelte:window onkeydown={handleShortcut} />

<Tooltip.Provider delayDuration={TOOLTIP_DELAY_MILLISECONDS}>
	<div class="shell">
		<TitleBar title={titleOf(currentPath)} />
		<PaneGroup
			direction="horizontal"
			autoSaveId="musubi-shell"
		>
			<Pane
				bind:this={explorer}
				defaultSize={PANE_SIZES.explorer.default}
				minSize={PANE_SIZES.explorer.min}
				collapsible
				collapsedSize={0}
			>
				<Explorer
					current={currentPath}
					onOpen={open}
				/>
			</Pane>
			<PaneResizer class="resizer" />
			<Pane
				defaultSize={PANE_SIZES.main.default}
				minSize={PANE_SIZES.main.min}
			>
				<PaneGroup direction="horizontal">
					{#each panes as pane, index (index)}
						{#if index > 0}
							<PaneResizer class="resizer" />
						{/if}
						<Pane minSize={PANE_SIZES.half.min}>
							<NotePane
								{pane}
								isFocused={index === focusedIndex}
								actions={actionsOf(index, pane)}
								onFocus={() => (focusedIndex = index)}
								onOpen={open}
								onMessage={setMessage}
								onEditorMode={setEditorMode}
							/>
						</Pane>
					{/each}
				</PaneGroup>
			</Pane>
			<PaneResizer class="resizer" />
			<Pane
				bind:this={backlinks}
				defaultSize={PANE_SIZES.backlinks.default}
				minSize={PANE_SIZES.backlinks.min}
				collapsible
				collapsedSize={0}
			>
				<BacklinksPanel
					current={currentPath}
					onOpen={open}
				/>
			</Pane>
		</PaneGroup>
		<StatusBar
			mode={statusMode}
			path={currentPath}
			{message}
		/>
	</div>
</Tooltip.Provider>

<CommandPalette
	bind:open={isPaletteOpen}
	{commands}
/>

<style>
	.shell {
		display: grid;
		grid-template-rows: auto 1fr auto;
		height: 100vh;
	}

	/* A 5-pixel handle, easy to grab, drawn as a 1-pixel line. */
	:global(.resizer) {
		width: 5px;
		background: linear-gradient(
			to right,
			transparent 2px,
			var(--border) 2px,
			var(--border) 3px,
			transparent 3px
		);
		cursor: col-resize;
	}

	:global(.resizer:hover),
	:global(.resizer[data-active]) {
		background: var(--accent);
	}
</style>
