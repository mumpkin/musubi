<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Interface mockup: title bar, explorer, one or two panes (each reading or
     editing any note), backlinks, status bar and command palette. Panes
     resize and fold with PaneForge. -->
<script lang="ts">
	import { Tooltip } from 'bits-ui';
	import { Pane, PaneGroup, PaneResizer } from 'paneforge';

	import type { VaultInfo } from '../bindings/VaultInfo.ts';
	import type { VaultTree } from '../bindings/VaultTree.ts';
	import type { SearchKind } from '../vault/search.ts';
	import { trashNote } from '../vault/trash.ts';
	import { parentOf, titleIn } from '../vault/tree.ts';
	import { openTutorial } from '../vault/vault.ts';
	import BacklinksPanel from './BacklinksPanel.svelte';
	import CommandPalette from './CommandPalette.svelte';
	import Explorer from './Explorer.svelte';
	import { PANE_SIZES, TOOLTIP_DELAY_MILLISECONDS } from './layout.ts';
	import NewEntryDialog from './NewEntryDialog.svelte';
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
	let creation = $state<{ kind: 'note' | 'folder'; folder: string }>();
	let isCreating = $state(false);
	let isPaletteOpen = $state(false);
	let isTrashOpen = $state(false);
	let search = $state<SearchKind>();
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

	function startCreation(kind: 'note' | 'folder', folder: string): void {
		creation = { kind, folder };
		isCreating = true;
	}

	function created(newTree: VaultTree, note: string | undefined): void {
		files.setTree(newTree);
		if (note !== undefined) {
			manager.open(note);
		}
	}

	function showMessage(text: string): void {
		manager.message = text;
	}

	function openNote(path: string, line?: number): void {
		manager.open(path, line);
	}

	function deleteNote(path: string): void {
		const next = files.tree.notes.find((note) => note.path !== path);
		trashNote(path)
			.then(async (entry) => {
				manager.forget(path, next?.path ?? '');
				showMessage(`Moved ${entry.title} to the trash`);
				await files.load();
			})
			.catch((error: unknown) => {
				showMessage(String(error));
			});
	}

	// Opens a note that was just written (restored, tutorial) once the tree
	// knows it.
	function restored(note: string | Promise<string>): void {
		Promise.resolve(note)
			.then(async (path) => {
				await files.load();
				openNote(path);
			})
			.catch((error: unknown) => {
				showMessage(String(error));
			});
	}

	// A link to a missing note creates it, titled from the link.
	manager.followLink = (path, text) => {
		files.prepareLink(path, text)
			.then(() => {
				openNote(path);
			})
			.catch((error: unknown) => {
				showMessage(String(error));
			});
	};

	const ACTIONS: Record<ShellAction, () => void> = {
		palette: () => {
			isPaletteOpen = true;
		},
		deleteNote: () => {
			deleteNote(manager.currentPath);
		},
		showTrash: () => {
			isTrashOpen = true;
		},
		openTutorial: () => {
			restored(openTutorial());
		},
		findNote: () => {
			search = 'titles';
		},
		searchText: () => {
			search = 'text';
		},
		newNote: () => {
			startCreation('note', parentOf(manager.currentPath));
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

	const commands = $derived(
		paletteCommands(ACTIONS, files.tree.notes, openNote),
	);

	const handleShortcut = shortcutHandler({
		isTyping: (event) => {
			const isInsert = manager.focused?.mode === 'editing'
				&& manager.editorMode === 'insert';
			const isInput = event.target instanceof HTMLInputElement;
			return isPaletteOpen || isTrashOpen || search !== undefined
				|| isInsert || isInput;
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
					current={manager.currentPath}
					onOpen={openNote}
					onCreate={startCreation}
					onDelete={deleteNote}
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
	bind:open={isPaletteOpen}
	{commands}
/>

<TrashDialog
	bind:open={isTrashOpen}
	onRestored={restored}
	onError={showMessage}
/>

<SearchPicker
	bind:kind={search}
	onOpen={openNote}
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

	/* A side panel has the focus: no pane shows it. */
	.shell:has(
		:global(.explorer:focus-within),
		:global(.backlinks:focus-within)
	) :global(.pane.focused) {
		border-top-color: transparent;
	}

</style>
