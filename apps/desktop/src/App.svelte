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
</script>

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
