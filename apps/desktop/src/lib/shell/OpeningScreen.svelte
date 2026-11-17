<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Shown while a vault opens: the first opening indexes every note, which
     takes a while on a large vault, so it says how far it is. -->
<script lang="ts">
	import { listen } from '@tauri-apps/api/event';
	import { onMount } from 'svelte';

	// `[done, total]`, sent by the core every few notes it indexes.
	let progress = $state<[number, number]>();

	onMount(() => {
		const stop = listen<[number, number]>('index-progress', (event) => {
			progress = event.payload;
		});
		return () => {
			stop.then((unlisten) => {
				unlisten();
			}).catch(() => undefined);
		};
	});

	const PERCENT = 100;
	const share = $derived(
		progress ? (progress[0] / Math.max(progress[1], 1)) * PERCENT : 0,
	);
</script>

<div
	class="opening"
	role="status"
>
	<p class="what">Opening your vault…</p>
	{#if progress}
		<p class="count">
			Indexing the notes: {progress[0].toLocaleString()} of {progress[1]
				.toLocaleString()}
		</p>
		<div
			class="bar"
			aria-hidden="true"
		>
			<div
				class="done"
				style:width="{share}%"
			></div>
		</div>
	{/if}
</div>

<style>
	.opening {
		display: grid;
		align-content: center;
		justify-items: center;
		gap: 0.5rem;
		height: 100%;
		color: var(--muted);
	}

	.what {
		margin: 0;
		color: var(--foreground);
		font-size: 1.05rem;
	}

	.count {
		margin: 0;
		font-size: 0.9rem;
		font-variant-numeric: tabular-nums;
	}

	.bar {
		overflow: hidden;
		width: min(20rem, 70vw);
		height: 0.3rem;
		border-radius: 1rem;
		background: var(--border);
	}

	.done {
		height: 100%;
		background: var(--accent);
		transition: width 0.3s ease-out;
	}
</style>
