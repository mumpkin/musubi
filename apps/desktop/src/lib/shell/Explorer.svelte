<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Side panel listing the notes of the vault by title. Folders fold; file
     paths only show in tooltips. -->
<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';

	import type { NoteEntry } from '../bindings/NoteEntry.ts';
	import type { TreeEditing } from '../tree-edit/tree-editing.svelte.ts';
	import TreeChangesDialog from '../tree-edit/TreeChangesDialog.svelte';
	import TreeEditor from '../tree-edit/TreeEditor.svelte';
	import type { FolderNode } from '../vault/tree.ts';
	import type { TrashActions } from './actions.ts';
	import ContextMenu from './ContextMenu.svelte';
	import {
		type EntryActions,
		isMenuKey,
		menuAt,
		type MenuItem,
	} from './explorer-menu.ts';
	import ExplorerFolder from './ExplorerFolder.svelte';
	import ExplorerHeader from './ExplorerHeader.svelte';
	import ExplorerSection from './ExplorerSection.svelte';
	import { focusFirst, listKeydown } from './list-keys.ts';
	import TrashSection from './TrashSection.svelte';

	interface Props {
		vaultName: string;
		root: FolderNode;
		archive: FolderNode | undefined;
		// Without it, the trash section is hidden (a setting).
		trash: TrashActions | undefined;
		pinned: NoteEntry[];
		recent: NoteEntry[];
		pinnedPaths: ReadonlySet<string>;
		current: string;
		onOpen: (path: string) => void;
		onPin: (path: string) => void;
		onArchive: (path: string) => void;
		onCreate: (kind: 'note' | 'folder', folder: string) => void;
		onDelete: (path: string) => void;
		// `Escape`: the focus goes back to the pane.
		onLeave: () => void;
		// The tree as text, edited as in oil.nvim.
		editing: TreeEditing;
		// Reviews the flashcards of a folder or a note (`''`: the vault).
		onReview: (scope: string) => void;
		// Flashcards due in the vault.
		dueCount: number;
	}

	const {
		vaultName,
		root,
		archive,
		trash,
		pinned,
		recent,
		pinnedPaths,
		current,
		onOpen,
		onPin,
		onArchive,
		onCreate,
		onDelete,
		onLeave,
		editing,
		onReview,
		dueCount,
	}: Props = $props();

	const rows = $derived({ current, pinnedPaths, onOpen });

	// The notes of a section, as a folder without sub-folders.
	function flat(notes: NoteEntry[]): FolderNode {
		return { name: '', path: '', folders: [], notes };
	}

	// Folded folders, by path.
	const folded = new SvelteSet<string>();

	// The entries that `j` and `k` move between.
	const ITEMS = '.folder, .note';
	let element = $state<HTMLElement>();
	let editor = $state<{ focus: () => void }>();
	type ShowMenu = (
		event: Event,
		items: MenuItem[],
		origin?: HTMLElement,
	) => void;
	let menu = $state<{ show: ShowMenu }>();

	const actions: EntryActions = {
		onOpen: (path) => {
			onOpen(path);
		},
		onPin: (path) => {
			onPin(path);
		},
		onArchive: (path) => {
			onArchive(path);
		},
		onCreate: (kind, folder) => {
			onCreate(kind, folder);
		},
		onDelete: (path) => {
			onDelete(path);
		},
		onRename: (path) => {
			editing.start(path);
		},
		onReview: (path) => {
			onReview(path);
		},
	};

	const showMenu: ShowMenu = (event, items, origin) => {
		menu?.show(event, items, origin);
	};

	// A right click, or the menu key on the focused entry.
	function openMenu(event: Event): void {
		if (editing.isActive) {
			return;
		}
		const { items, origin } = menuAt(event.target, pinnedPaths, actions);
		menu?.show(event, items, origin);
	}

	// `Space h` / `Space l`: the focus goes to the current note, or to the
	// tree editor.
	export function focusList(): void {
		if (editing.isActive) {
			editor?.focus();
			return;
		}
		focusFirst(element, ITEMS, '.tree .note.current');
	}
</script>

<!-- `j`, `k`, `l` and `Escape` reach the panel from its entries. -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<nav
	bind:this={element}
	class="explorer"
	class:editing={editing.isActive}
	aria-label="Notes"
	tabindex="-1"
	oncontextmenu={openMenu}
	onkeydown={(event) => {
		if (isMenuKey(event)) {
			openMenu(event);
		} else if (!editing.isActive) {
			const list = { container: element, selector: ITEMS, onLeave };
			listKeydown(event, list);
		}
	}}
>
	<ExplorerHeader
		{vaultName}
		{current}
		{editing}
		{onCreate}
		{dueCount}
		{onReview}
		onMenu={showMenu}
	/>
	{#if editing.isActive}
		{#key editing.tree}
			<div class="tree-text">
				<TreeEditor
					bind:this={editor}
					text={editing.tree.text}
					startLine={editing.startLine}
					onWrite={editing.write}
					onQuit={editing.quit}
					onChange={editing.changed}
					onOpenLine={editing.openLine}
					onModeChange={editing.modeChanged}
					onFocusChange={editing.focusChanged}
					onMessage={editing.message}
				/>
			</div>
		{/key}
	{:else}
		{#if recent.length > 0}
			<ExplorerSection
				name="Recent"
				icon="recent"
				{folded}
			>
				<ExplorerFolder
					folder={flat(recent)}
					{folded}
					{...rows}
				/>
			</ExplorerSection>
		{/if}
		{#if pinned.length > 0}
			<ExplorerSection
				name="Pinned"
				icon="pin"
				{folded}
			>
				<ExplorerFolder
					folder={flat(pinned)}
					{folded}
					{...rows}
				/>
			</ExplorerSection>
		{/if}
		<ExplorerSection
			name="Notebook"
			icon="notebook"
			{folded}
		>
			<div class="tree">
				<ExplorerFolder
					folder={root}
					{folded}
					{...rows}
				/>
			</div>
		</ExplorerSection>
		{#if archive}
			<ExplorerSection
				name="Archive"
				icon="archive"
				{folded}
			>
				<ExplorerFolder
					folder={archive}
					{folded}
					{...rows}
				/>
			</ExplorerSection>
		{/if}
		{#if trash}
			<TrashSection
				{folded}
				actions={trash}
				onMenu={showMenu}
			/>
		{/if}
	{/if}
</nav>

<ContextMenu bind:this={menu} />

<TreeChangesDialog
	changes={editing.changes}
	onAnswer={editing.answerChanges}
/>

<style>
	.explorer {
		display: flex;
		flex-direction: column;
		height: 100%;
		outline: none;
		overflow: auto;
		padding: 0.5rem 0.25rem;
		background: var(--surface);
	}

	/* The tree editor scrolls by itself. */
	.explorer.editing {
		overflow: hidden;
	}

	.tree-text {
		flex: 1;
		min-height: 0;
	}

</style>
