<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- One setting: its name and what it does on the left, its control on
     the right. -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		description?: string;
		// Id of the control the name labels.
		control?: string;
		children: Snippet;
	}

	const { label, description, control, children }: Props = $props();
</script>

<div class="setting-row">
	<div class="text">
		<label
			class="name"
			for={control}
		>{label}</label>
		{#if description}
			<p class="description">{description}</p>
		{/if}
	</div>
	<div class="control">
		{@render children()}
	</div>
</div>

<style>
	.setting-row {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 1.5rem;
		align-items: center;
		padding: 0.7rem 0;
		border-bottom: 1px solid var(--border);
	}

	.setting-row:last-child {
		border-bottom: none;
	}

	.name {
		display: block;
		font-weight: 500;
	}

	.description {
		margin: 0.15rem 0 0;
		color: var(--muted);
		font-size: 0.85rem;
		line-height: 1.35;
	}

	.control {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		justify-content: flex-end;
	}
</style>
