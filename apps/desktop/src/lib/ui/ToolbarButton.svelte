<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- An icon button that names its action and its shortcut on hover. -->
<script lang="ts">
	import { Tooltip } from 'bits-ui';

	import type { IconName } from './actions.ts';
	import Icon from './Icon.svelte';
	import { TOOLTIP_OFFSET_PIXELS } from './layout.ts';

	interface Props {
		icon: IconName;
		label: string;
		shortcut: string;
		onClick: () => void;
	}

	const { icon, label, shortcut, onClick }: Props = $props();
</script>

<Tooltip.Root>
	<Tooltip.Trigger
		class="toolbar-button"
		aria-label={label}
		onclick={onClick}
	><Icon name={icon} /></Tooltip.Trigger>
	<Tooltip.Portal>
		<Tooltip.Content
			class="tooltip"
			sideOffset={TOOLTIP_OFFSET_PIXELS}
		>
			{label}
			{#if shortcut}
				<kbd>{shortcut}</kbd>
			{/if}
		</Tooltip.Content>
	</Tooltip.Portal>
</Tooltip.Root>

<style>
	:global(.toolbar-button) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.8rem;
		height: 1.6rem;
		border: none;
		border-radius: 4px;
		background: none;
		color: var(--muted);
		cursor: pointer;
		transition:
			background-color 0.15s,
			color 0.15s;
	}

	:global(.toolbar-button:hover),
	:global(.toolbar-button:focus-visible) {
		outline: none;
		background: var(--hover);
		color: var(--foreground);
	}
</style>
