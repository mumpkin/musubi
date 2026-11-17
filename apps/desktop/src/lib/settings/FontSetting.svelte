<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- A font: the default one, a generic family, or any font installed on
     the computer, by name. -->
<script lang="ts">
	import { FONT_FAMILIES } from './preferences.ts';
	import SelectSetting from './SelectSetting.svelte';

	interface Props {
		id: string;
		// Empty for the default font.
		font: string;
		onChange: (font: string) => void;
	}

	const { id, font, onChange }: Props = $props();

	const OTHER = ':other';
	const LABELS = {
		'sans-serif': 'Sans serif',
		'serif': 'Serif',
		'monospace': 'Monospace',
	};
	const CHOICES = [
		{ value: '', label: 'Default' },
		...FONT_FAMILIES.map((family) => ({
			value: family,
			label: LABELS[family],
		})),
		{ value: OTHER, label: 'Other font…' },
	];

	const isNamed = (value: string): boolean =>
		value === '' || (FONT_FAMILIES as readonly string[]).includes(value);

	let isOther = $state(false);
	const chosen = $derived(isOther || !isNamed(font) ? OTHER : font);
</script>

<SelectSetting
	{id}
	value={chosen}
	choices={CHOICES}
	onChange={(value: string) => {
		isOther = value === OTHER;
		if (!isOther) {
			onChange(value);
		}
	}}
/>
{#if chosen === OTHER}
	<input
		class="font-name"
		aria-label="Font name"
		placeholder="Font name"
		value={isNamed(font) ? '' : font}
		onchange={(event) => {
			onChange(event.currentTarget.value.trim());
		}}
	/>
{/if}

<style>
	.font-name {
		width: 9rem;
		padding: 0.3rem 0.5rem;
		border: 1px solid var(--border);
		border-radius: 5px;
		background: var(--background);
		color: inherit;
		font: inherit;
	}

	.font-name:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 1px;
	}
</style>
