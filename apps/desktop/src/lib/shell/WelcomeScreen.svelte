<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Shown when no vault is open: choose a folder to use as a vault. -->
<script lang="ts">
	import type { VaultInfo } from '../bindings/VaultInfo.ts';
	import { demoVaultPath, openVault, pickFolder } from '../vault/vault.ts';

	interface Props {
		onOpen: (vault: VaultInfo) => void;
	}

	const { onOpen }: Props = $props();

	let failure = $state<string>();
	const demo = demoVaultPath().catch(() => null);

	async function openFolder(folder: string | null): Promise<void> {
		if (folder === null) {
			return;
		}
		try {
			onOpen(await openVault(folder));
		} catch (error) {
			failure = String(error);
		}
	}

	function choose(): void {
		pickFolder()
			.then(openFolder)
			.catch((error: unknown) => {
				failure = String(error);
			});
	}
</script>

<main class="welcome">
	<h1>Musubi</h1>
	<p>Notes written in Typst, edited the Helix way.</p>
	<p class="muted">
		A vault is a folder of notes. Choose an empty folder to start a new one,
		or a folder you already sync.
	</p>
	<button
		class="primary"
		onclick={choose}
	>Open a folder…</button>
	{#await demo then path}
		{#if path}
			<button
				onclick={() => {
					void openFolder(path);
				}}
			>Open the demo vault</button>
		{/if}
	{/await}
	{#if failure}
		<p class="error">{failure}</p>
	{/if}
</main>

<style>
	.welcome {
		display: grid;
		gap: 0.75rem;
		place-content: center;
		justify-items: center;
		height: 100%;
		text-align: center;
	}

	h1 {
		margin: 0;
	}

	p {
		max-width: 28rem;
		margin: 0;
	}

	.muted {
		color: var(--muted);
	}

	button {
		min-width: 14rem;
		padding: 0.5rem 1rem;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--background);
		color: inherit;
		font: inherit;
		cursor: pointer;
	}

	button.primary {
		border-color: var(--accent);
		background: var(--accent);
		color: var(--background);
	}

	.error {
		color: var(--error);
	}
</style>
