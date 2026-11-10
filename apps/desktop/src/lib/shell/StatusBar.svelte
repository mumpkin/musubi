<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Mode of the focused pane, its note, and shortcuts. -->
<script lang="ts">
	interface Props {
		mode: string;
		path: string;
		message: string;
	}

	const { mode, path, message }: Props = $props();
</script>

<footer class="status-bar">
	<span
		class="mode"
		class:insert={mode === 'INS'}
	>{mode}</span>
	<span class="path">{path}</span>
	{#if message}
		<span class="message">{message}</span>
	{/if}
	<span class="hint">
		Space ? commands · Space e notes · Space l backlinks · Ctrl-w v split
	</span>
</footer>

<style>
	.status-bar {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		padding: 0.2rem 0.75rem;
		border-top: 1px solid var(--border);
		background: var(--surface);
		font-family: ui-monospace, monospace;
		font-size: 0.8rem;
	}

	.mode {
		padding: 0 0.4rem;
		border-radius: 3px;
		background: var(--hover);
		font-weight: 600;
	}

	.mode.insert {
		background: var(--accent);
		color: var(--background);
	}

	.path {
		flex: 1;
		color: var(--muted);
	}

	.message {
		color: var(--accent);
	}

	.hint {
		color: var(--muted);
	}
</style>
