<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Title of a pane and its actions, with tooltips from Bits UI. -->
<script lang="ts">
	import { Tooltip } from 'bits-ui';

	import type { PaneAction } from './actions.ts';
	import Icon from './Icon.svelte';
	import { TOOLTIP_OFFSET_PIXELS } from './layout.ts';

	interface Props {
		title: string;
		mode: string;
		actions: PaneAction[];
	}

	const { title, mode, actions }: Props = $props();
</script>

<header class="pane-header">
	<span class="mode">{mode}</span>
	<span class="title">{title}</span>
	{#each actions as action (action.label)}
		<Tooltip.Root>
			<Tooltip.Trigger
				class="pane-action"
				aria-label={action.label}
				onclick={action.run}
			><Icon name={action.icon} /></Tooltip.Trigger>
			<Tooltip.Portal>
				<Tooltip.Content
					class="tooltip"
					sideOffset={TOOLTIP_OFFSET_PIXELS}
				>
					{action.label}
					<kbd>{action.shortcut}</kbd>
				</Tooltip.Content>
			</Tooltip.Portal>
		</Tooltip.Root>
	{/each}
</header>

<style>
	.pane-header {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		padding: 0.3rem 0.75rem;
		border-bottom: 1px solid var(--border);
		font-size: 0.85rem;
	}

	.mode {
		color: var(--muted);
		font-family: ui-monospace, monospace;
		font-size: 0.75rem;
	}

	.title {
		flex: 1;
		font-weight: 600;
	}

	:global(.pane-action) {
		padding: 0.1rem 0.4rem;
		border: none;
		border-radius: 4px;
		background: none;
		color: var(--muted);
		font: inherit;
		cursor: pointer;
	}

	:global(.pane-action:hover) {
		background: var(--hover);
		color: inherit;
	}

	:global(.tooltip kbd) {
		margin-left: 0.5rem;
		opacity: 0.7;
		font-family: ui-monospace, monospace;
	}

	:global(.tooltip) {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		background: var(--foreground);
		color: var(--background);
		font-size: 0.8rem;
	}
</style>
