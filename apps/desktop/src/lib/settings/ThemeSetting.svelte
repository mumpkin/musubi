<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- The theme section of the settings: the system theme or one of the
     themes, which applies at once; import a theme, remove an imported one. -->
<script lang="ts">
	import { RadioGroup } from 'bits-ui';

	import { themes } from '../theme/theme-state.svelte.ts';

	interface Props {
		onError: (message: string) => void;
	}

	const { onError }: Props = $props();

	// Value of the system choice. Theme ids are letters, digits and `-`;
	// Bits UI takes an empty value for no choice, which arrows skip.
	const SYSTEM = ':system';

	const chosenImport = $derived(
		themes.choices.find((choice) =>
			choice.isImported && choice.id === themes.chosen),
	);

	function run(task: Promise<unknown>): void {
		task.catch((error: unknown) => {
			onError(String(error));
		});
	}
</script>

<section aria-labelledby="theme-heading">
	<h3 id="theme-heading">Theme</h3>
	<RadioGroup.Root
		class="choices"
		value={themes.chosen ?? SYSTEM}
		onValueChange={(value) => {
			run(themes.choose(value === SYSTEM ? null : value));
		}}
	>
		<RadioGroup.Item
			class="choice"
			value={SYSTEM}
		>Follow the system (GitHub Light or Dark)</RadioGroup.Item>
		{#each themes.choices as choice (choice.id)}
			<RadioGroup.Item
				class="choice"
				value={choice.id}
			>{choice.theme.name}</RadioGroup.Item>
		{/each}
	</RadioGroup.Root>
	<div class="buttons">
		<button
			onclick={() => {
				run(themes.importFile());
			}}
		>Import a theme</button>
		{#if chosenImport}
			<button
				class="danger"
				onclick={() => {
					run(themes.remove(chosenImport.id));
				}}
			>Remove {chosenImport.theme.name}</button>
		{/if}
	</div>
</section>

<style>
	:global(.choices) {
		display: grid;
		gap: 0.15rem;
	}

	/* A round mark before each choice, filled when it is chosen. */
	:global(.choice) {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		padding: 0.3rem 0.5rem;
		border: none;
		border-radius: 4px;
		background: none;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	:global(.choice::before) {
		content: '';
		width: 0.7rem;
		height: 0.7rem;
		border: 1px solid var(--muted);
		border-radius: 50%;
	}

	:global(.choice[data-state='checked']::before) {
		border-color: var(--accent);
		background: radial-gradient(var(--accent) 45%, transparent 50%);
	}

	:global(.choice:hover),
	:global(.choice:focus-visible) {
		outline: none;
		background: var(--hover);
	}

	.buttons {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}
</style>
