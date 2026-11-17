<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- A whole number within bounds, with its unit after it. A number out of
     bounds is put back as it was. -->
<script lang="ts">
	import { boundedNumber } from './commands.ts';

	interface Props {
		id: string;
		value: number;
		bounds: { min: number; max: number };
		unit: string;
		isDisabled?: boolean;
		onChange: (value: number) => void;
	}

	const {
		id,
		value,
		bounds,
		unit,
		isDisabled = false,
		onChange,
	}: Props = $props();

	function commit(input: HTMLInputElement): void {
		const next = boundedNumber(input.value, bounds);
		if (next === undefined) {
			input.value = String(value);
			return;
		}
		onChange(next);
	}
</script>

<input
	{id}
	class="number"
	type="number"
	min={bounds.min}
	max={bounds.max}
	{value}
	disabled={isDisabled}
	onchange={(event) => {
		commit(event.currentTarget);
	}}
/>
<span class="unit">{unit}</span>

<style>
	.number {
		width: 4.5rem;
		padding: 0.25rem 0.4rem;
		border: 1px solid var(--border);
		border-radius: 4px;
		background: var(--background);
		color: inherit;
		font: inherit;
		text-align: right;
	}

	.number:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 1px;
	}

	.number:disabled,
	.number:disabled + .unit {
		color: var(--muted);
	}

	.unit {
		min-width: 3.5rem;
		font-size: 0.9rem;
	}
</style>
