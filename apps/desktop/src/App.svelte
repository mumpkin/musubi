<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Opens the vault of the last session, or asks for one. -->
<script lang="ts">
	import type { VaultInfo } from './lib/bindings/VaultInfo.ts';
	import Shell from './lib/shell/Shell.svelte';
	import TitleBar from './lib/shell/TitleBar.svelte';
	import WelcomeScreen from './lib/shell/WelcomeScreen.svelte';
	import { currentVault } from './lib/vault/vault.ts';

	let vault = $state<VaultInfo | null>();

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

{#if vault}
	{#key vault.root}
		<Shell {vault} />
	{/key}
{:else if vault === null}
	<div class="start">
		<TitleBar title="" />
		<WelcomeScreen onOpen={show} />
	</div>
{/if}

<style>
	.start {
		display: grid;
		grid-template-rows: auto 1fr;
		height: 100vh;
	}
</style>
