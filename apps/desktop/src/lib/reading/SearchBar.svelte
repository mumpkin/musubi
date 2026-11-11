<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- The search line of the reading view, opened by `/` or `?`. -->
<script lang="ts">
	interface Props {
		label: string;
		onSubmit: (text: string) => void;
		onCancel: () => void;
	}

	const { label, onSubmit, onCancel }: Props = $props();

	let text = $state('');
	let input = $state<HTMLInputElement>();

	$effect(() => {
		input?.focus();
	});

	function handleKey(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			event.preventDefault();
			onCancel();
		} else if (event.key === 'Enter') {
			event.preventDefault();
			onSubmit(text);
		}
	}
</script>

<footer>
	<label>
		<span>{label}</span>
		<input
			bind:this={input}
			bind:value={text}
			onkeydown={handleKey}
			spellcheck="false"
		/>
	</label>
</footer>

<style>
	footer {
		position: sticky;
		bottom: 0;
		padding: 0.25rem 0.75rem;
		border-top: 1px solid var(--border);
		background: var(--background);
		font-family: ui-monospace, monospace;
		font-size: 0.85rem;
	}

	label {
		display: flex;
		gap: 0.25rem;
	}

	input {
		flex: 1;
		border: none;
		outline: none;
		background: none;
		color: inherit;
		font: inherit;
	}
</style>
