<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- A row of the graph panel: a label, then choices side by side, one of
     them checked (a segmented control). -->
<script
	lang="ts"
generics="Value extends string"
>
	interface Choice {
		value: Value;
		label: string;
		isDisabled?: boolean;
	}

	interface Props {
		label: string;
		// What the choices are about, for screen readers.
		description: string;
		choices: readonly Choice[];
		checked: Value;
		onChoose: (value: Value) => void;
	}

	const { label, description, choices, checked, onChoose }: Props = $props();
</script>

<div class="row">
	<span class="label">{label}</span>
	<div
		class="choices"
		role="radiogroup"
		aria-label={description}
	>
		{#each choices as choice (choice.value)}
			<button
				type="button"
				role="radio"
				aria-checked={checked === choice.value}
				disabled={choice.isDisabled}
				onclick={() => {
					onChoose(choice.value);
				}}
			>{choice.label}</button>
		{/each}
	</div>
</div>

<style>
	.row {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.label {
		flex-shrink: 0;
		width: 2.8rem;
		color: var(--muted);
		font-size: 0.8rem;
	}

	.choices {
		display: flex;
		flex: 1;
		padding: 0.15rem;
		border-radius: 6px;
		background: var(--surface);
	}

	button {
		flex: 1;
		padding: 0.1rem 0.3rem;
		border: none;
		border-radius: 4px;
		background: none;
		color: var(--muted);
		font: inherit;
		white-space: nowrap;
		cursor: pointer;
	}

	button:focus-visible {
		outline: 1px solid var(--accent);
	}

	button[aria-checked='true'] {
		background: var(--background);
		box-shadow: 0 0 0 1px var(--border);
		color: var(--foreground);
	}

	button:disabled {
		opacity: 0.5;
		cursor: default;
	}
</style>
