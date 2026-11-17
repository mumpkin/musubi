<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- The main actions of the shell as buttons of the title bar, for the
     mouse: each one names its action and its shortcut on hover. The rest
     is in the command palette, its last button. -->
<script lang="ts">
	import type { IconName } from './actions.ts';
	import {
		ACTION_LABELS,
		type ShellAction,
		shortcutLabel,
	} from './shortcuts.ts';
	import ToolbarButton from './ToolbarButton.svelte';

	interface Props {
		side: 'start' | 'end';
		onAction: (action: ShellAction) => void;
	}

	const { side, onAction }: Props = $props();

	const TOOLS: Record<'start' | 'end', [ShellAction, IconName][]> = {
		start: [
			['toggleExplorer', 'explorer'],
			['findNote', 'find'],
			['searchText', 'searchText'],
			['home', 'home'],
			['newNote', 'newNote'],
		],
		end: [
			['review', 'cards'],
			['toggleGraph', 'graph'],
			['toggleBacklinks', 'backlinks'],
			['palette', 'commands'],
			['settings', 'settings'],
		],
	};
</script>

<div
	class="toolbar"
	role="toolbar"
	aria-label={side === 'start' ? 'Notes' : 'View'}
>
	{#each TOOLS[side] as [action, icon] (action)}
		<ToolbarButton
			{icon}
			label={ACTION_LABELS[action].label}
			shortcut={shortcutLabel(action)}
			onClick={() => {
				onAction(action);
			}}
		/>
	{/each}
</div>

<style>
	.toolbar {
		display: flex;
		gap: 0.1rem;
		align-items: center;
	}
</style>
