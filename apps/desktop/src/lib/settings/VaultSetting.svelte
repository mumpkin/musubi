<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- The vault section of the settings: the open vault, the vaults opened
     before on this device, and a folder picker for another one (a new
     empty folder becomes a vault with the tutorial). -->
<script lang="ts">
	import { knownVaults, pickFolder } from '../vault/vault.ts';

	interface Props {
		// Root of the open vault.
		root: string;
		onOpen: (folder: string) => void;
		onError: (message: string) => void;
	}

	const { root, onOpen, onError }: Props = $props();

	let others = $state<string[]>([]);

	$effect(() => {
		knownVaults()
			.then((vaults) => {
				others = vaults.filter((vault) => vault !== root);
			})
			.catch((error: unknown) => {
				onError(String(error));
			});
	});

	function choose(): void {
		pickFolder()
			.then((folder) => {
				if (folder !== null) {
					onOpen(folder);
				}
			})
			.catch((error: unknown) => {
				onError(String(error));
			});
	}

	const nameOf = (path: string): string =>
		path.slice(path.lastIndexOf('/') + 1);
</script>

<section aria-labelledby="vault-heading">
	<h3 id="vault-heading">Vault</h3>
	<p
		class="current"
		title={root}
	><strong>{nameOf(root)}</strong> <span>{root}</span></p>
	{#each others as vault (vault)}
		<button
			class="choice vault"
			title="Open {vault}"
			onclick={() => {
				onOpen(vault);
			}}
		><strong>{nameOf(vault)}</strong> <span>{vault}</span></button>
	{/each}
	<button onclick={choose}>Open a folder…</button>
</section>

<style>
	.current,
	.vault {
		overflow: hidden;
		margin: 0 0 0.35rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.current span,
	.vault span {
		color: var(--muted);
		font-size: 0.8rem;
	}

	.vault {
		display: block;
		width: 100%;
		padding: 0.25rem 0.5rem;
		border: 1px solid var(--border);
		border-radius: 4px;
		background: var(--background);
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.vault:hover,
	.vault:focus-visible {
		outline: none;
		background: var(--hover);
	}
</style>
