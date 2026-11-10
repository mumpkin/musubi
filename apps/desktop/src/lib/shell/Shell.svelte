<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Interface mockup: explorer, two panes side by side (reading and
     editing), backlinks, status bar and command palette. Panes resize and
     fold with PaneForge. -->
<script lang="ts">
	import { type EditorMode, modeIndicator } from '@musubi/editor';
	import { Tooltip } from 'bits-ui';
	import { Pane, type PaneAPI, PaneGroup, PaneResizer } from 'paneforge';

	import HelixEditor from '../editor/HelixEditor.svelte';
	import type { PaletteCommand } from './actions.ts';
	import BacklinksPanel from './BacklinksPanel.svelte';
	import CommandPalette from './CommandPalette.svelte';
	import Explorer from './Explorer.svelte';
	import { PANE_SIZES, TOOLTIP_DELAY_MILLISECONDS } from './layout.ts';
	import { FOLDERS, ROOT_NOTES, sourceOf, titleOf } from './mock-vault.ts';
	import PaneHeader from './PaneHeader.svelte';
	import ReadingPane from './ReadingPane.svelte';
	import StatusBar from './StatusBar.svelte';

	type Side = 'reading' | 'editing';

	let readingPath = $state('Demo.typ');
	let editingPath = $state('Demo.typ');
	let focused = $state<Side>('reading');
	let editorMode = $state<EditorMode>('normal');
	let isPaletteOpen = $state(false);
	let message = $state('');
	let explorer = $state<PaneAPI>();
	let backlinks = $state<PaneAPI>();

	const currentPath = $derived(
		focused === 'reading' ? readingPath : editingPath,
	);
	const statusMode = $derived(
		focused === 'reading' ? 'LEC' : modeIndicator(editorMode),
	);

	function open(path: string): void {
		if (focused === 'reading') {
			readingPath = path;
		} else {
			editingPath = path;
		}
	}

	function setEditorMode(mode: EditorMode): void {
		editorMode = mode;
	}

	function toggle(pane: PaneAPI | undefined): void {
		if (pane?.isCollapsed()) {
			pane.expand();
		} else {
			pane?.collapse();
		}
	}

	const notes = [...ROOT_NOTES, ...FOLDERS.flatMap((folder) => folder.notes)];

	const commands: PaletteCommand[] = [
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
		{
			label: 'Edit the note being read',
			group: 'Note',
			run: () => {
				editingPath = readingPath;
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
				<PaneGroup
					direction="horizontal"
					autoSaveId="musubi-panes"
				>
					<Pane
						defaultSize={PANE_SIZES.half.default}
						minSize={PANE_SIZES.half.min}
					>
						<section
							class="pane"
							class:focused={focused === 'reading'}
							onfocusin={() => (focused = 'reading')}
						>
							<PaneHeader
								title={titleOf(readingPath)}
								mode="LEC"
								actions={[{
									label: 'Edit this note in the other pane',
									icon: '✎',
									run: () => {
										editingPath = readingPath;
									},
								}]}
							/>
							<ReadingPane
								path={readingPath}
								onOpen={open}
							/>
						</section>
					</Pane>
					<PaneResizer class="resizer" />
					<Pane
						defaultSize={PANE_SIZES.half.default}
						minSize={PANE_SIZES.half.min}
					>
						<section
							class="pane"
							class:focused={focused === 'editing'}
							onfocusin={() => (focused = 'editing')}
						>
							<PaneHeader
								title={titleOf(editingPath)}
								mode={modeIndicator(editorMode)}
								actions={[{
									label: 'Read this note in the other pane',
									icon: '◧',
									run: () => {
										readingPath = editingPath;
									},
								}]}
							/>
							{#key editingPath}
								<HelixEditor
									text={sourceOf(editingPath)}
									onWrite={() => {
										message = ':w — saving comes with the vault';
									}}
									onQuit={() => {
										message = ':q — closing panes comes later';
									}}
									onModeChange={setEditorMode}
								/>
							{/key}
						</section>
					</Pane>
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
		grid-template-rows: 1fr auto;
		height: 100vh;
	}

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
