<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Title bar in the style of the app, replacing the one of the system: it
     moves the window (drag, double click to maximize) and holds the window
     buttons, and, with a vault open, the main actions for the mouse. -->
<script lang="ts">
	import { getCurrentWindow } from '@tauri-apps/api/window';

	import type { ShellAction } from '../shortcuts/shortcuts.ts';
	import Icon from '../ui/Icon.svelte';
	import ShellToolbar from './ShellToolbar.svelte';

	interface Props {
		title: string;
		// Runs an action of the toolbar; without it, no toolbar.
		onAction?: (action: ShellAction) => void;
	}

	const { title, onAction }: Props = $props();

	// Outside Tauri (in a browser) there is no window to control.
	function windowAction(action: 'minimize' | 'toggleMaximize' | 'close') {
		return (): void => {
			getCurrentWindow()[action]().catch(() => undefined);
		};
	}
</script>

<header
	class="title-bar"
	data-tauri-drag-region
>
	<span
		class="app"
		data-tauri-drag-region
	>Musubi</span>
	{#if onAction}
		<ShellToolbar
			side="start"
			{onAction}
		/>
	{/if}
	<span
		class="title"
		data-tauri-drag-region
	>{title}</span>
	{#if onAction}
		<ShellToolbar
			side="end"
			{onAction}
		/>
	{/if}
	<div class="buttons">
		<button
			aria-label="Minimize"
			title="Minimize"
			onclick={windowAction('minimize')}
		>
			<Icon name="minimize" />
		</button>
		<button
			aria-label="Maximize"
			title="Maximize"
			onclick={windowAction('toggleMaximize')}
		>
			<Icon name="maximize" />
		</button>
		<button
			class="close"
			aria-label="Close"
			title="Close"
			onclick={windowAction('close')}
		>
			<Icon name="close" />
		</button>
	</div>
</header>

<style>
	.title-bar {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		height: 2rem;
		padding-left: 0.75rem;
		border-bottom: 1px solid var(--border);
		background: var(--surface);
		font-size: 0.85rem;
		user-select: none;
	}

	.app {
		font-weight: 600;
	}

	.title {
		flex: 1;
		overflow: hidden;
		color: var(--muted);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.buttons {
		display: flex;
		height: 100%;
	}

	button {
		display: grid;
		place-items: center;
		width: 2.75rem;
		height: 100%;
		border: none;
		background: none;
		color: inherit;
		cursor: pointer;
	}

	button:hover {
		background: var(--hover);
	}

	button.close:hover {
		background: var(--error);
		color: var(--background);
	}
</style>
