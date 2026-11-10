<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Interface mockup: title bar, explorer, one or two panes (each reading or
     editing any note), backlinks, status bar and command palette. Panes
     resize and fold with PaneForge. -->
<script lang="ts">
	import { type EditorMode, modeIndicator } from '@musubi/editor';
	import { Tooltip } from 'bits-ui';
	import { Pane, type PaneAPI, PaneGroup, PaneResizer } from 'paneforge';
	import { tick } from 'svelte';

	import type { VaultInfo } from '../bindings/VaultInfo.ts';
	import type { VaultTree } from '../bindings/VaultTree.ts';
	import { buildTree, parentOf, titleIn } from '../vault/tree.ts';
	import type { PaletteCommand, PaneAction } from './actions.ts';
	import BacklinksPanel from './BacklinksPanel.svelte';
	import CommandPalette from './CommandPalette.svelte';
	import Explorer from './Explorer.svelte';
	import { PANE_SIZES, TOOLTIP_DELAY_MILLISECONDS } from './layout.ts';
	import NewEntryDialog from './NewEntryDialog.svelte';
	import NotePane from './NotePane.svelte';
	import {
		MAX_PANES,
		otherMode,
		paneActions,
		type PaneState,
	} from './panes.ts';
	import {
		ACTION_LABELS,
		keyName,
		resolveShortcut,
		type ShellAction,
		shortcutLabel,
	} from './shortcuts.ts';
	import StatusBar from './StatusBar.svelte';
	import TitleBar from './TitleBar.svelte';

	interface Props {
		vault: VaultInfo;
	}

	const { vault }: Props = $props();

	// svelte-ignore state_referenced_locally
	let tree = $state(vault.tree);
	const root = $derived(buildTree(tree));
	let panes = $state<PaneState[]>([{
		// svelte-ignore state_referenced_locally
		path: vault.tree.notes[0]?.path ?? '',
		mode: 'reading',
	}]);
	let creation = $state<{ kind: 'note' | 'folder'; folder: string }>();
	let isCreating = $state(false);
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
			focusAfterRender(index);
		}
	}

	// A second pane, on the same note in the other mode.
	function split(): void {
		const pane = panes[focusedIndex];
		if (pane && panes.length < MAX_PANES) {
			panes.push({ path: pane.path, mode: otherMode(pane.mode) });
			focusAfterRender(panes.length - 1);
		}
	}

	function close(index: number): void {
		if (panes.length > 1) {
			panes.splice(index, 1);
			focusAfterRender(0);
		}
	}

	function toggle(pane: PaneAPI | undefined): void {
		if (pane?.isCollapsed()) {
			pane.expand();
		} else {
			pane?.collapse();
		}
	}

	function startCreation(kind: 'note' | 'folder', folder: string): void {
		creation = { kind, folder };
		isCreating = true;
	}

	function created(newTree: VaultTree, note: string | undefined): void {
		tree = newTree;
		if (note !== undefined) {
			open(note);
		}
	}

	function setEditorMode(mode: EditorMode): void {
		editorMode = mode;
	}

	function setMessage(text: string): void {
		message = text;
	}

	function actionsOf(index: number, pane: PaneState): PaneAction[] {
		return paneActions(pane, {
			canSplit: panes.length < MAX_PANES,
			toggleMode: () => {
				toggleMode(index);
			},
			split,
			close: () => {
				close(index);
			},
		});
	}

	// The keyboard focus follows the pane, once its content is on screen.
	function focusAfterRender(index: number): void {
		focusedIndex = index;
		tick()
			.then(() => {
				focusPane(index);
			})
			.catch(() => undefined);
	}

	function focusPane(index: number): void {
		focusedIndex = (index + panes.length) % panes.length;
		const element = document.querySelectorAll<HTMLElement>('.pane')
			.item(focusedIndex);
		element.querySelector<HTMLElement>('.reading-view, .cm-content')
			?.focus();
	}

	const ACTIONS: Record<ShellAction, () => void> = {
		palette: () => {
			isPaletteOpen = true;
		},
		newNote: () => {
			startCreation('note', parentOf(currentPath));
		},
		toggleExplorer: () => {
			toggle(explorer);
		},
		toggleBacklinks: () => {
			toggle(backlinks);
		},
		toggleMode: () => {
			toggleMode(focusedIndex);
		},
		split,
		closePane: () => {
			close(focusedIndex);
		},
		nextPane: () => {
			focusPane(focusedIndex + 1);
		},
		leftPane: () => {
			focusPane(focusedIndex - 1);
		},
		rightPane: () => {
			focusPane(focusedIndex + 1);
		},
	};

	const commands: PaletteCommand[] = $derived([
		...Object.entries(ACTION_LABELS)
			.filter(([action]) => action !== 'palette')
			.map(([action, { label, group }]) => ({
				label,
				group,
				shortcut: shortcutLabel(action as ShellAction),
				run: ACTIONS[action as ShellAction],
			})),
		...tree.notes.map((note) => ({
			label: note.title,
			group: 'Open a note',
			run: () => {
				open(note.path);
			},
		})),
	]);

	let pendingKeys = '';

	// Shortcuts are read before the panes see the keys, except while typing
	// text: in insert mode, the command line or the palette.
	function isTyping(event: KeyboardEvent): boolean {
		const isInsert = focusedPane?.mode === 'editing'
			&& editorMode === 'insert';
		const isInput = event.target instanceof HTMLInputElement;
		return isPaletteOpen || isInsert || isInput;
	}

	function handleShortcut(event: KeyboardEvent): void {
		if (isTyping(event)) {
			return;
		}
		const isReadingEdit = focusedPane?.mode === 'reading'
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

<svelte:window onkeydowncapture={handleShortcut} />

<Tooltip.Provider delayDuration={TOOLTIP_DELAY_MILLISECONDS}>
	<div class="shell">
		<TitleBar title={titleIn(tree, currentPath)} />
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
					current={currentPath}
					onOpen={open}
					onCreate={startCreation}
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
								title={titleIn(tree, pane.path)}
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
				<BacklinksPanel />
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

{#if creation}
	<NewEntryDialog
		bind:open={isCreating}
		kind={creation.kind}
		folder={creation.folder}
		onCreated={created}
		onError={setMessage}
	/>
{/if}

<style>
	.shell {
		display: grid;
		grid-template-rows: auto 1fr auto;
		height: 100vh;
	}

</style>
