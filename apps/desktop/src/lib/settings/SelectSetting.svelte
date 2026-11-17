<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- A choice among a few named values, in a list that opens. -->
<script
	lang="ts"
generics="Value extends string | number"
>
	interface Choice {
		value: Value;
		label: string;
	}

	interface Props {
		id: string;
		value: Value;
		choices: readonly Choice[];
		onChange: (value: Value) => void;
	}

	const { id, value, choices, onChange }: Props = $props();

	function choose(index: number): void {
		const choice = choices[index];
		if (choice) {
			onChange(choice.value);
		}
	}
</script>

<select
	{id}
	class="select"
	onchange={(event) => {
		choose(event.currentTarget.selectedIndex);
	}}
>
	{#each choices as choice (choice.value)}
		<option
			value={String(choice.value)}
			selected={choice.value === value}
		>{choice.label}</option>
	{/each}
</select>

<style>
	/* Drawn by the app: the height of the other fields, its own chevron. */
	.select {
		min-width: 9rem;
		padding: 0.25rem 1.8rem 0.25rem 0.5rem;
		border: 1px solid var(--border);
		border-radius: 5px;
		background: var(--background);
		color: inherit;
		font: inherit;
		cursor: pointer;
		appearance: none;
	}

	.select:not(:disabled) {
		background-image: linear-gradient(
				45deg,
				transparent 50%,
				currentcolor 50%
			),
			linear-gradient(135deg, currentcolor 50%, transparent 50%);
		background-repeat: no-repeat;
		background-position:
			calc(100% - 0.95rem) 55%,
			calc(100% - 0.65rem) 55%;
		background-size: 0.3rem 0.3rem;
	}

	.select:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 1px;
	}
</style>
