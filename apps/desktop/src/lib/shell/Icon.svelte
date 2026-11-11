<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Small line icons of the pane headers, drawn in SVG so that they look the
     same everywhere. -->
<script lang="ts">
	import type { IconName } from './actions.ts';

	interface Props {
		name: IconName;
	}

	const { name }: Props = $props();
</script>

<svg
	viewBox="0 0 16 16"
	aria-hidden="true"
>
	{#if name === 'edit'}
		<path d="M11 2.5l2.5 2.5L6 12.5H3.5V10z M9.5 4l2.5 2.5" />
	{:else if name === 'read'}
		<!-- An open book: two pages meeting at the spine. -->
		<path d="M8 4C6.5 3 4.5 2.5 2 2.5v10c2.5 0 4.5.5 6 1.5z" />
		<path d="M8 4c1.5-1 3.5-1.5 6-1.5v10c-2.5 0-4.5.5-6 1.5z" />
	{:else if name === 'split'}
		<rect
			x="2.5"
			y="2.5"
			width="11"
			height="11"
			rx="1"
		/>
		<path
			class="filled"
			d="M3 3h5v10H3z"
		/>
	{:else if name === 'trash'}
		<!-- A bin with its lid. -->
		<path d="M2.5 4.5h11M6 4.5V3h4v1.5M4 4.5l.7 9h6.6l.7-9" />
	{:else if name === 'pin'}
		<!-- A push pin: head, body and point. -->
		<path d="M6 2.5h4M7 2.5v3.5L4.5 9h7L9 6V2.5M8 9v4.5" />
	{:else}
		<path d="M4 4l8 8M12 4l-8 8" />
	{/if}
</svg>

<style>
	svg {
		width: 14px;
		height: 14px;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.3;
		stroke-linejoin: round;
		vertical-align: middle;
	}

	.filled {
		fill: currentColor;
		stroke: none;
	}
</style>
