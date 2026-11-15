<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- The folders of the vault, as the explorer shows them (indented, with
     the color of each folder on the right), to pick the one the graph
     shows. -->
<script lang="ts">
	import { folderPalette } from '../vault/folder-palette.svelte.ts';

	interface Props {
		// The folder picked, by path.
		picked: string;
		onPick: (folder: string) => void;
	}

	const { picked, onPick }: Props = $props();

	// Room before a folder name, and more for each level down.
	const PADDING_REM = 0.5;
	const INDENT_REM = 0.8;

	const nameOf = (folder: string) =>
		folder.slice(folder.lastIndexOf('/') + 1);
	const paddingOf = (folder: string) => {
		const depth = folder.split('/').length - 1;
		return `${String(PADDING_REM + depth * INDENT_REM)}rem`;
	};
</script>

<ul
	class="folder-list"
	aria-label="Folder shown"
>
	{#each folderPalette.folders as folder (folder)}
		<li>
			<button
				type="button"
				class:picked={folder === picked}
				aria-current={folder === picked}
				title={folder}
				style:padding-left={paddingOf(folder)}
				onclick={() => {
					onPick(folder);
				}}
			>
				<span class="name">{nameOf(folder)}</span>
				<span
					class="folder-color"
					style:background={folderPalette.colorOf(folder)}
					aria-hidden="true"
				></span>
			</button>
		</li>
	{/each}
</ul>

<style>
	.folder-list {
		overflow-y: auto;
		max-height: 9rem;
		margin: 0;
		padding: 0.15rem;
		border-radius: 6px;
		background: var(--surface);
		list-style: none;
	}

	button {
		display: flex;
		align-items: center;
		width: 100%;
		min-width: 0;
		padding: 0.15rem 0.5rem;
		border: none;
		border-radius: 4px;
		background: none;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	button:hover {
		background: var(--hover);
	}

	button:focus-visible {
		outline: none;
		background: var(--hover);
		box-shadow: inset 2px 0 0 var(--accent);
	}

	button.picked {
		background: var(--selection);
	}

	.name {
		overflow: hidden;
		min-width: 0;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.folder-color {
		flex-shrink: 0;
		width: 0.5rem;
		height: 0.5rem;
		margin: 0 0.1rem 0 auto;
		border-radius: 50%;
	}
</style>
