<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Interface mockup: title bar, explorer, one or two panes (each reading or
     editing any note), backlinks, status bar and command palette. Panes
     resize and fold with PaneForge. -->
<script lang="ts">
	import { Tooltip } from 'bits-ui';
	import { Pane, type PaneAPI, PaneGroup, PaneResizer } from 'paneforge';

	import type { DeviceSettings } from '../bindings/DeviceSettings.ts';
	import type { VaultInfo } from '../bindings/VaultInfo.ts';
	import type { VaultTree } from '../bindings/VaultTree.ts';
	import { createLinkedNote, linkedNoteTitle } from '../vault/links.ts';
	import { buildTree, parentOf, titleIn } from '../vault/tree.ts';
	import { deviceSettings, vaultTree } from '../vault/vault.ts';
	import type { PaneAction } from './actions.ts';
	import BacklinksPanel from './BacklinksPanel.svelte';
	import CommandPalette from './CommandPalette.svelte';
	import Explorer from './Explorer.svelte';
	import {
		PANE_SIZES,
		toggle,
		TOOLTIP_DELAY_MILLISECONDS,
	} from './layout.ts';
	import NewEntryDialog from './NewEntryDialog.svelte';
	import NotePane from './NotePane.svelte';
	import { paletteCommands } from './palette.ts';
	import { PaneManager } from './pane-manager.svelte.ts';
	import { paneActions, type PaneState } from './panes.ts';
	import { keyName, resolveShortcut, type ShellAction } from './shortcuts.ts';
	import StatusBar from './StatusBar.svelte';
	import TitleBar from './TitleBar.svelte';

	interface Props {
		vault: VaultInfo;
	}

	const { vault }: Props = $props();

	// svelte-ignore state_referenced_locally
	let tree = $state(vault.tree);
	// Bumped on every read of the tree: the backlinks may have changed.
	let treeLoads = $state(0);
	const root = $derived(buildTree(tree));
	const notePaths = $derived(new Set(tree.notes.map((note) => note.path)));
	// svelte-ignore state_referenced_locally
	const manager = new PaneManager(vault.tree.notes[0]?.path ?? '');
	let creation = $state<{ kind: 'note' | 'folder'; folder: string }>();
	let isCreating = $state(false);
	let isPaletteOpen = $state(false);
	let explorer = $state<PaneAPI>();
	let backlinks = $state<PaneAPI>();
	let settings = $state<DeviceSettings>();

	deviceSettings()
		.then((loaded) => {
			settings = loaded;
		})
		.catch(() => undefined);

	const autosaveDelay = $derived(
		settings?.autosave ? settings.autosaveDelaySeconds : undefined,
	);

	function loadTree(): void {
		vaultTree()
			.then((loaded) => {
				tree = loaded;
				treeLoads += 1;
			})
			.catch(() => undefined);
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

	function startCreation(kind: 'note' | 'folder', folder: string): void {
		creation = { kind, folder };
		isCreating = true;
	}

	function created(newTree: VaultTree, note: string | undefined): void {
		tree = newTree;
		if (note !== undefined) {
			manager.open(note);
		}
	}

	function showMessage(text: string): void {
		manager.message = text;
	}

	function openNote(path: string): void {
		manager.open(path);
	}

	// A link to a missing note creates it, titled from the link.
	manager.followLink = (path, text) => {
		const ready = notePaths.has(path)
			? Promise.resolve()
			: createLinkedNote(path, linkedNoteTitle(path, text))
				.then(loadTree);
		ready
			.then(() => {
				openNote(path);
			})
			.catch((error: unknown) => {
				showMessage(String(error));
			});
	};

	function actionsOf(index: number, pane: PaneState): PaneAction[] {
		return paneActions(pane, {
			canSplit: manager.canSplit,
			toggleMode: () => {
				manager.toggleMode(index);
			},
			split: () => {
				manager.split();
			},
			close: () => {
				manager.close(index);
			},
		});
	}

	const ACTIONS: Record<ShellAction, () => void> = {
		palette: () => {
			isPaletteOpen = true;
		},
		newNote: () => {
			startCreation('note', parentOf(manager.currentPath));
		},
		toggleExplorer: () => {
			toggle(explorer);
		},
		toggleBacklinks: () => {
			toggle(backlinks);
		},
		toggleMode: () => {
			manager.toggleMode(manager.focusedIndex);
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
		leftPane: () => {
			manager.focusPane(manager.focusedIndex - 1);
		},
		rightPane: () => {
			manager.focusPane(manager.focusedIndex + 1);
		},
	};

	const commands = $derived(paletteCommands(ACTIONS, tree.notes, openNote));

	let pendingKeys = '';

	// Shortcuts are read before the panes see the keys, except while typing
	// text: in insert mode, the command line or the palette.
	function isTyping(event: KeyboardEvent): boolean {
		const isInsert = manager.focused?.mode === 'editing'
			&& manager.editorMode === 'insert';
		const isInput = event.target instanceof HTMLInputElement;
		return isPaletteOpen || isInsert || isInput;
	}

	function handleShortcut(event: KeyboardEvent): void {
		if (isTyping(event)) {
			return;
		}
		const isReadingEdit = manager.focused?.mode === 'reading'
			&& pendingKeys === '' && event.key === 'i';
		const resolution = isReadingEdit
			? { action: 'toggleMode' as const, pending: '', isUsed: true }
			: resolveShortcut(pendingKeys, keyName(event));
		pendingKeys = resolution.pending;
		if (resolution.isUsed) {
			event.preventDefault();
			event.stopPropagation();
		}
		if (resolution.action) {
			ACTIONS[resolution.action]();
		}
	}
</script>

<svelte:window
	onkeydowncapture={handleShortcut}
	onfocus={refresh}
/>

<Tooltip.Provider delayDuration={TOOLTIP_DELAY_MILLISECONDS}>
	<div class="shell">
		<TitleBar title={titleIn(tree, manager.currentPath)} />
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
					vaultName={vault.name}
					{root}
					current={manager.currentPath}
					onOpen={openNote}
					onCreate={startCreation}
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
								title={titleIn(tree, pane.path)}
								isFocused={index === manager.focusedIndex}
								actions={actionsOf(index, pane)}
								revision={manager.revisions.get(pane.path) ?? 0}
								{autosaveDelay}
								notes={notePaths}
								events={manager.events(index)}
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
					path={manager.currentPath}
					revision={treeLoads}
					onOpen={openNote}
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
	bind:open={isPaletteOpen}
	{commands}
/>

{#if creation}
	<NewEntryDialog
		bind:open={isCreating}
		kind={creation.kind}
		folder={creation.folder}
		onCreated={created}
		onError={showMessage}
	/>
{/if}

<style>
	.shell {
		display: grid;
		grid-template-rows: auto 1fr auto;
		height: 100vh;
	}

</style>
