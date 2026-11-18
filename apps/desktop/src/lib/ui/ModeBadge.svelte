<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- The mode of a pane or of the tree editor: `READ`, `NORMAL`, `INSERT`…
     Insert mode stands out. -->
<script lang="ts">
	interface Props {
		mode: string;
	}

	const { mode }: Props = $props();
</script>

<span
	class="mode"
	class:insert={mode === 'INSERT'}
>{mode}</span>

<style>
	.mode {
		flex: none;
		padding: 0 0.35rem;
		border-radius: 3px;
		background: var(--hover);
		color: var(--muted);
		font-family: ui-monospace, monospace;
		font-size: 0.72rem;
		font-weight: 600;
	}

	.insert {
		background: var(--accent);
		color: var(--background);
	}
</style>
