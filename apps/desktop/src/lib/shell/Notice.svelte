<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- A message of the app (saved, error, changes applied), shown for a few
     seconds at the bottom right of the window, in place of a status bar. -->
<script lang="ts">
	interface Props {
		message: string;
		// The message has been shown: the shell clears it.
		onDone: () => void;
	}

	const { message, onDone }: Props = $props();

	const SHOWN_MILLISECONDS = 4000;

	$effect(() => {
		if (message === '') {
			return undefined;
		}
		const timer = setTimeout(onDone, SHOWN_MILLISECONDS);
		return () => {
			clearTimeout(timer);
		};
	});
</script>

{#if message}
	<div
		class="notice"
		role="status"
	>{message}</div>
{/if}

<style>
	.notice {
		position: fixed;
		right: 1rem;
		bottom: 1rem;
		z-index: 40;
		max-width: 28rem;
		padding: 0.4rem 0.75rem;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--surface);
		box-shadow: 0 2px 8px rgb(0 0 0 / 12%);
		font-size: 0.85rem;
	}
</style>
