<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Title bar in the style of the app, replacing the one of the system: it
     moves the window (drag, double click to maximize) and holds the window
     buttons. -->
<script lang="ts">
	import { getCurrentWindow } from '@tauri-apps/api/window';

	import Icon from './Icon.svelte';

	interface Props {
		title: string;
	}

	const { title }: Props = $props();

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
	<span
		class="title"
		data-tauri-drag-region
	>{title}</span>
	<div class="buttons">
		<button
			aria-label="Minimize"
			onclick={windowAction('minimize')}
		>
			<Icon name="minimize" />
		</button>
		<button
			aria-label="Maximize"
			onclick={windowAction('toggleMaximize')}
		>
			<Icon name="maximize" />
		</button>
		<button
			class="close"
			aria-label="Close"
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
		color: var(--muted);
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
