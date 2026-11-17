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

	// Long enough to read: a short message stays four seconds, a longer
	// one (an error that says what to do) up to ten.
	const SHOWN_MILLISECONDS = 4000;
	const LONGEST_MILLISECONDS = 10_000;
	const SHORT_MESSAGE = 60;
	const MILLISECONDS_PER_CHARACTER = 50;

	const extra = $derived(Math.max(0, message.length - SHORT_MESSAGE));
	const duration = $derived(Math.min(
		LONGEST_MILLISECONDS,
		SHOWN_MILLISECONDS + extra * MILLISECONDS_PER_CHARACTER,
	));
	// Messages of the core start in lower case.
	const sentence = $derived(
		message.charAt(0).toUpperCase() + message.slice(1),
	);

	$effect(() => {
		if (message === '') {
			return undefined;
		}
		const timer = setTimeout(onDone, duration);
		return () => {
			clearTimeout(timer);
		};
	});
</script>

{#if message}
	<div
		class="notice"
		role="status"
	>{sentence}</div>
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
