<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Title of a pane and its actions, with tooltips from Bits UI. -->
<script lang="ts">
	import { Tooltip } from 'bits-ui';

	import type { PaneAction } from './actions.ts';
	import Icon from './Icon.svelte';
	import { TOOLTIP_OFFSET_PIXELS } from './layout.ts';
	import ModeBadge from './ModeBadge.svelte';

	interface Props {
		title: string;
		// Unsaved changes: a dot after the title.
		isModified?: boolean;
		mode: string;
		actions: PaneAction[];
	}

	const { title, isModified = false, mode, actions }: Props = $props();
</script>

<header class="pane-header">
	<ModeBadge {mode} />
	<span class="title">
		{title}
		{#if isModified}
			<span
				class="modified"
				title="Unsaved changes"
			><Icon name="modified" /></span>
		{/if}
	</span>
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

	.title {
		display: flex;
		flex: 1;
		gap: 0.35rem;
		align-items: center;
		font-weight: 600;
	}

	/* A small filled dot, as in most editors. */
	.modified {
		display: grid;
		place-items: center;
	}

	.modified :global(svg) {
		width: 0.5rem;
		height: 0.5rem;
		fill: currentColor;
	}

	:global(.pane-action) {
		display: grid;
		place-items: center;
		padding: 0.15rem 0.3rem;
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
