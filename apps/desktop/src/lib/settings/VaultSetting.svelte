<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- The vaults of this device: the open one, the ones opened before, and a
     folder picker for another one (a new empty folder becomes a vault with
     the tutorial). -->
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

<ul
	class="vaults"
	aria-label="Vaults"
>
	<li class="vault current">
		<span class="where">
			<strong>{nameOf(root)}</strong>
			<span class="path">{root}</span>
		</span>
		<span class="badge">Open</span>
	</li>
	{#each others as vault (vault)}
		<li class="vault">
			<span class="where">
				<strong>{nameOf(vault)}</strong>
				<span class="path">{vault}</span>
			</span>
			<button
				class="button"
				title="Open {vault}"
				onclick={() => {
					onOpen(vault);
				}}
			>Switch</button>
		</li>
	{/each}
</ul>
<button
	class="button"
	onclick={choose}
>Open a folder…</button>

<style>
	.vaults {
		margin: 0 0 0.75rem;
		padding: 0;
		border: 1px solid var(--border);
		border-radius: 6px;
		list-style: none;
	}

	.vault {
		display: flex;
		gap: 1rem;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--border);
	}

	.vault:last-child {
		border-bottom: none;
	}

	.where {
		display: grid;
		min-width: 0;
	}

	.path {
		overflow: hidden;
		color: var(--muted);
		font-size: 0.8rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.badge {
		color: var(--accent);
		font-size: 0.8rem;
		font-weight: 600;
	}
</style>
