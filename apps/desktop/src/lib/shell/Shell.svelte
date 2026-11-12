<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Interface mockup: title bar, explorer, one or two panes (each reading or
     editing any note), backlinks, status bar and command palette. Panes
     resize and fold with PaneForge. -->
<script lang="ts">
	import { Tooltip } from 'bits-ui';
	import { Pane, PaneGroup, PaneResizer } from 'paneforge';

	import type { VaultInfo } from '../bindings/VaultInfo.ts';
	import type { VaultTree } from '../bindings/VaultTree.ts';
	import SettingsDialog from '../settings/SettingsDialog.svelte';
	import { themeCommands } from '../theme/theme-commands.ts';
	import { themes } from '../theme/theme-state.svelte.ts';
	import { parentOf, titleIn } from '../vault/tree.ts';
	import { openTutorial } from '../vault/vault.ts';
	import BacklinksPanel from './BacklinksPanel.svelte';
	import CommandPalette from './CommandPalette.svelte';
	import { ShellDialogs } from './dialogs.svelte.ts';
	import Explorer from './Explorer.svelte';
	import { PANE_SIZES, TOOLTIP_DELAY_MILLISECONDS } from './layout.ts';
	import NewEntryDialog from './NewEntryDialog.svelte';
	import { NoteActions } from './note-actions.ts';
	import NotePane from './NotePane.svelte';
	import { paletteCommands } from './palette.ts';
	import { PaneManager } from './pane-manager.svelte.ts';
	import SearchPicker from './SearchPicker.svelte';
	import { shortcutHandler } from './shortcut-handler.ts';
	import type { ShellAction } from './shortcuts.ts';
	import { SidePanels } from './side-panels.svelte.ts';
	import StatusBar from './StatusBar.svelte';
	import TitleBar from './TitleBar.svelte';
	import TrashDialog from './TrashDialog.svelte';
	import { VaultState } from './vault-state.svelte.ts';

	interface Props {
		vault: VaultInfo;
	}

	const { vault }: Props = $props();

	// svelte-ignore state_referenced_locally
	const files = new VaultState(vault.tree);
	// svelte-ignore state_referenced_locally
	const manager = new PaneManager(
		vault.firstNote ?? vault.tree.notes[0]?.path ?? '',
	);
	const dialogs = new ShellDialogs();
	// svelte-ignore state_referenced_locally
	let trashRetentionDays = $state(vault.trashRetentionDays);
	const panels = new SidePanels(manager);

	function loadTree(): void {
		files.load().catch(() => undefined);
	}

	// Back in the window: notes and titles may have changed on disk.
	function refresh(): void {
		manager.reload();
		loadTree();
	}

	// A save may change the title of a note.
	$effect(() => {
		if (manager.saves > 0) {
			loadTree();
		}
	});

	function created(newTree: VaultTree, note: string | undefined): void {
		files.setTree(newTree);
		if (note !== undefined) {
			manager.open(note);
		}
	}

	function openNote(path: string, line?: number): void {
		manager.open(path, line);
	}

	const notes = new NoteActions(files, manager);

	// The note of the focused pane goes first in the recent notes.
	$effect(() => {
		if (manager.currentPath !== '') {
			files.opened(manager.currentPath).catch(() => undefined);
		}
	});

	const ACTIONS: Record<ShellAction, () => void> = {
		palette: () => {
			dialogs.isPaletteOpen = true;
		},
		deleteNote: () => {
			notes.deleteNote(manager.currentPath);
		},
		deleteFolder: () => {
			notes.deleteFolder(parentOf(manager.currentPath));
		},
		showTrash: () => {
			dialogs.isTrashOpen = true;
		},
		settings: () => {
			dialogs.isSettingsOpen = true;
		},
		openTutorial: () => {
			notes.restored(openTutorial());
		},
		findNote: () => {
			dialogs.search = 'titles';
		},
		searchText: () => {
			dialogs.search = 'text';
		},
		newNote: () => {
			dialogs.startCreation('note', parentOf(manager.currentPath));
		},
		togglePin: () => {
			notes.togglePin(manager.currentPath);
		},
		toggleExplorer: () => {
			panels.toggleExplorer();
		},
		toggleBacklinks: () => {
			panels.toggleBacklinks();
		},
		toggleMode: () => {
			manager.toggleMode(manager.focusedIndex);
		},
		toggleGraph: () => {
			manager.toggleGraph(manager.focusedIndex);
		},
		split: () => {
			manager.split();
		},
		closePane: () => {
			manager.close(manager.focusedIndex);
		},
		nextPane: () => {
			manager.focusPane(manager.focusedIndex + 1);
		},
		leftPanel: () => {
			panels.move(-1);
		},
		rightPanel: () => {
			panels.move(1);
		},
	};

	const commands = $derived([
		...paletteCommands(ACTIONS, files.tree.notes, openNote),
		...themeCommands(themes, notes.showMessage),
	]);

	const handleShortcut = shortcutHandler({
		isTyping: (event) => {
			const isInsert = manager.focused?.mode === 'editing'
				&& manager.editorMode === 'insert';
			const isInput = event.target instanceof HTMLInputElement;
			return dialogs.isOpen || isInsert || isInput;
		},
		isReading: () => manager.focused?.mode === 'reading'
			&& panels.isInPane(),
		run: (action) => {
			ACTIONS[action]();
		},
	});
</script>

<svelte:window
	onkeydowncapture={handleShortcut}
	onfocus={refresh}
/>

<Tooltip.Provider delayDuration={TOOLTIP_DELAY_MILLISECONDS}>
	<div class="shell">
		<TitleBar title={titleIn(files.tree, manager.currentPath)} />
		<PaneGroup
			direction="horizontal"
			autoSaveId="musubi-shell"
		>
			<Pane
				bind:this={panels.explorer}
				defaultSize={PANE_SIZES.explorer.default}
				minSize={PANE_SIZES.explorer.min}
				collapsible
				collapsedSize={0}
			>
				<Explorer
					bind:this={panels.explorerList}
					vaultName={vault.name}
					root={files.root}
					pinned={files.pinnedNotes}
					recent={files.recentNotes}
					pinnedPaths={files.pinnedPaths}
					current={manager.currentPath}
					onOpen={openNote}
					onPin={notes.togglePin}
					onCreate={dialogs.startCreation}
					onDelete={notes.deleteNote}
					onLeave={() => {
						panels.back();
					}}
				/>
			</Pane>
			<PaneResizer class="resizer" />
			<Pane
				defaultSize={PANE_SIZES.main.default}
				minSize={PANE_SIZES.main.min}
			>
				<PaneGroup direction="horizontal">
					{#each manager.panes as pane, index (index)}
						{#if index > 0}
							<PaneResizer class="resizer" />
						{/if}
						<Pane minSize={PANE_SIZES.half.min}>
							<NotePane
								{pane}
								title={titleIn(files.tree, pane.path)}
								isFocused={index === manager.focusedIndex}
								actions={manager.actionsOf(index)}
								revision={manager.revisions.get(pane.path) ?? 0}
								autosaveDelay={files.autosaveDelay}
								notes={files.notePaths}
								events={manager.events(index)}
							/>
						</Pane>
					{/each}
				</PaneGroup>
			</Pane>
			<PaneResizer class="resizer" />
			<Pane
				bind:this={panels.backlinks}
				defaultSize={PANE_SIZES.backlinks.default}
				minSize={PANE_SIZES.backlinks.min}
				collapsible
				collapsedSize={0}
			>
				<BacklinksPanel
					bind:this={panels.backlinksList}
					path={manager.currentPath}
					revision={files.loads}
					onOpen={openNote}
					onLeave={() => {
						panels.back();
					}}
				/>
			</Pane>
		</PaneGroup>
		<StatusBar
			mode={manager.statusMode}
			path={manager.currentPath}
			message={manager.message}
		/>
	</div>
</Tooltip.Provider>

<CommandPalette
	bind:open={dialogs.isPaletteOpen}
	{commands}
/>

<TrashDialog
	bind:open={dialogs.isTrashOpen}
	onRestored={notes.restored}
	onError={notes.showMessage}
/>

<SettingsDialog
	bind:open={dialogs.isSettingsOpen}
	bind:trashRetentionDays
	settings={files.settings}
	isReadOnly={vault.readOnly}
	onSettings={files.updateSettings}
	onError={notes.showMessage}
/>

<SearchPicker
	bind:kind={dialogs.search}
	onOpen={openNote}
/>

{#if dialogs.creation}
	<NewEntryDialog
		bind:open={dialogs.isCreating}
		kind={dialogs.creation.kind}
		folder={dialogs.creation.folder}
		onCreated={created}
		onError={notes.showMessage}
	/>
{/if}

<style>
	.shell {
		display: grid;
		grid-template-rows: auto 1fr auto;
		height: 100vh;
	}

	/* A side panel has the focus: no pane shows it. */
	.shell:has(
		:global(.explorer:focus-within),
		:global(.backlinks:focus-within)
	) :global(.pane.focused) {
		border-top-color: transparent;
	}

</style>
