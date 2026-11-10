<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Prototypes of the J0 milestone, side by side in tabs. -->
<script lang="ts">
	import EditorDemo from './lib/editor/EditorDemo.svelte';
	import ReadingDemo from './lib/reading/ReadingDemo.svelte';

	const TABS = ['Reading view', 'Helix editor'] as const;

	let tab = $state<(typeof TABS)[number]>('Reading view');
</script>

<div class="app">
	<nav>
		{#each TABS as name (name)}
			<button
				class:active={name === tab}
				onclick={() => (tab = name)}
			>
				{name}
			</button>
		{/each}
	</nav>
	<main>
		{#if tab === 'Reading view'}
			<ReadingDemo />
		{:else}
			<EditorDemo />
		{/if}
	</main>
</div>

<style>
	.app {
		display: grid;
		grid-template-rows: auto 1fr;
		height: 100vh;
	}

	nav {
		display: flex;
		gap: 0.25rem;
		padding: 0.4rem 1rem;
		border-bottom: 1px solid var(--border);
		background: var(--surface);
	}

	main {
		overflow: auto;
		min-height: 0;
	}

	button {
		padding: 0.25rem 0.75rem;
		border: 1px solid transparent;
		border-radius: 4px;
		background: none;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}

	button.active {
		border-color: var(--border);
		background: var(--background);
	}
</style>
