<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- The theme of the window: the system theme or one of the themes, shown
     as small previews, which applies at once; import a theme, remove an
     imported one. -->
<script lang="ts">
	import { RadioGroup } from 'bits-ui';

	import type { Theme } from '../bindings/Theme.ts';
	import { themes } from '../theme/theme-state.svelte.ts';
	import { cssVariables, DEFAULT_THEMES } from '../theme/themes.ts';

	interface Props {
		onError: (message: string) => void;
	}

	const { onError }: Props = $props();

	// Value of the system choice. Theme ids are letters, digits and `-`;
	// Bits UI takes an empty value for no choice, which arrows skip.
	const SYSTEM = ':system';
	const [light, dark] = DEFAULT_THEMES;

	const chosenImport = $derived(
		themes.choices.find((choice) =>
			choice.isImported && choice.id === themes.chosen),
	);

	function run(task: Promise<unknown>): void {
		task.catch((error: unknown) => {
			onError(String(error));
		});
	}

	// The colors a preview shows.
	function colorsOf(theme: Theme | undefined): string {
		if (!theme) {
			return '';
		}
		const colors = cssVariables(theme);
		return ['background', 'foreground', 'muted', 'accent', 'border']
			.map((name) => `--preview-${name}: ${colors.get(`--${name}`) ?? ''}`)
			.join('; ');
	}
</script>

{#snippet preview(theme: Theme | undefined)}
	<span
		class="preview"
		style={colorsOf(theme)}
		aria-hidden="true"
	>
		<span class="sample">Aa</span>
		<span class="lines">
			<span class="line accent"></span>
			<span class="line"></span>
			<span class="line short"></span>
		</span>
	</span>
{/snippet}

<RadioGroup.Root
	class="theme-grid"
	aria-label="Theme"
	value={themes.chosen ?? SYSTEM}
	onValueChange={(value) => {
		run(themes.choose(value === SYSTEM ? null : value));
	}}
>
	<RadioGroup.Item
		class="theme-card"
		value={SYSTEM}
	>
		<span class="split">
			{@render preview(light?.theme)}
			{@render preview(dark?.theme)}
		</span>
		<span class="theme-name">Follow the system</span>
	</RadioGroup.Item>
	{#each themes.choices as choice (choice.id)}
		<RadioGroup.Item
			class="theme-card"
			value={choice.id}
		>
			{@render preview(choice.theme)}
			<span class="theme-name">{choice.theme.name}</span>
		</RadioGroup.Item>
	{/each}
</RadioGroup.Root>
<div class="theme-actions">
	<button
		class="button"
		onclick={() => {
			run(themes.importFile());
		}}
	>Import a theme…</button>
	{#if chosenImport}
		<button
			class="button danger"
			onclick={() => {
				run(themes.remove(chosenImport.id));
			}}
		>Remove {chosenImport.theme.name}</button>
	{/if}
</div>

<style>
	:global(.theme-grid) {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
		gap: 0.75rem;
	}

	:global(.theme-card) {
		display: grid;
		gap: 0.4rem;
		padding: 0.4rem;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: none;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	:global(.theme-card[data-state='checked']) {
		border-color: var(--accent);
		box-shadow: 0 0 0 1px var(--accent);
	}

	:global(.theme-card:focus-visible) {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.split {
		display: grid;
		grid-template-columns: 1fr 1fr;
		overflow: hidden;
		border-radius: 5px;
	}

	.split .preview {
		border-radius: 0;
	}

	.preview {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		height: 3.2rem;
		padding: 0 0.6rem;
		border: 1px solid var(--preview-border);
		border-radius: 5px;
		background: var(--preview-background);
	}

	.sample {
		color: var(--preview-foreground);
		font-size: 1.1rem;
		font-weight: 600;
	}

	.lines {
		display: grid;
		flex: 1;
		gap: 0.3rem;
	}

	.line {
		height: 0.25rem;
		border-radius: 1px;
		background: var(--preview-muted);
	}

	.line.accent {
		width: 70%;
		background: var(--preview-accent);
	}

	.line.short {
		width: 50%;
	}

	.theme-name {
		padding: 0 0.15rem;
		font-size: 0.85rem;
	}

	.theme-actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.9rem;
	}
</style>
