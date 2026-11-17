<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- An on/off switch for a setting. -->
<script lang="ts">
	import { Switch } from 'bits-ui';

	interface Props {
		id: string;
		checked: boolean;
		onChange: (checked: boolean) => void;
	}

	const { id, checked, onChange }: Props = $props();
</script>

<Switch.Root
	{id}
	class="switch"
	{checked}
	onCheckedChange={onChange}
>
	<Switch.Thumb class="thumb" />
</Switch.Root>

<style>
	:global(.switch) {
		display: inline-flex;
		align-items: center;
		width: 2.1rem;
		height: 1.2rem;
		padding: 0.1rem;
		border: none;
		border-radius: 1rem;
		background: var(--border);
		cursor: pointer;
	}

	:global(.switch[data-state='checked']) {
		background: var(--accent);
	}

	:global(.switch:focus-visible) {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	:global(.thumb) {
		display: block;
		width: 1rem;
		height: 1rem;
		border-radius: 50%;
		background: var(--background);
		transition: transform 0.15s;
	}

	:global(.thumb[data-state='checked']) {
		transform: translateX(0.9rem);
	}
</style>
