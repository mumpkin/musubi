<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Opens the vault of the last session, or asks for one. -->
<script lang="ts">
	import type { VaultInfo } from './lib/bindings/VaultInfo.ts';
	import OpeningScreen from './lib/shell/OpeningScreen.svelte';
	import Shell from './lib/shell/Shell.svelte';
	import TitleBar from './lib/shell/TitleBar.svelte';
	import WelcomeScreen from './lib/shell/WelcomeScreen.svelte';
	import { currentVault, openVault } from './lib/vault/vault.ts';

	let vault = $state<VaultInfo | null>();
	// Another vault is opening, from the settings.
	let isSwitching = $state(false);

	currentVault()
		.then((current) => {
			vault = current;
		})
		.catch(() => {
			vault = null;
		});

	function show(opened: VaultInfo): void {
		vault = opened;
	}

	// From the settings: another vault replaces the open one.
	async function switchVault(folder: string): Promise<void> {
		isSwitching = true;
		try {
			show(await openVault(folder));
		} finally {
			isSwitching = false;
		}
	}

	// The menu of the webview (reload, inspect…) is not part of the app;
	// text fields keep theirs, for copy and paste.
	function blockNativeMenu(event: MouseEvent): void {
		const { target } = event;
		const isText = target instanceof Element
			&& target.closest('input, textarea, [contenteditable=true]') !== null;
		if (!isText) {
			event.preventDefault();
		}
	}
</script>

<svelte:window oncontextmenu={blockNativeMenu} />

{#if vault === undefined}
	<div class="start">
		<TitleBar title="" />
		<OpeningScreen />
	</div>
{:else if vault}
	{#key vault.root}
		<Shell
			{vault}
			onVault={switchVault}
		/>
	{/key}
{:else}
	<div class="start">
		<TitleBar title="" />
		<WelcomeScreen onOpen={show} />
	</div>
{/if}
{#if isSwitching}
	<!-- Over the open vault: it keeps its state if the other one fails. -->
	<div class="switching">
		<OpeningScreen />
	</div>
{/if}

<style>
	.switching {
		position: fixed;
		inset: 0;
		z-index: 100;
		background: var(--background);
	}

	.start {
		display: grid;
		grid-template-rows: auto 1fr;
		height: 100vh;
	}
</style>
