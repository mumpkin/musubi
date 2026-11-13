<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Asks what to do with the unsaved changes of a note about to leave its
     pane: save (`s`, `Enter`), discard (`d`) or cancel (`c`, `Escape`). -->
<script lang="ts">
	import { Dialog } from 'bits-ui';

	import type { UnsavedChoice, UnsavedPrompt } from './unsaved-prompt.svelte.ts';

	interface Props {
		prompt: UnsavedPrompt;
	}

	const { prompt }: Props = $props();

	const KEYS = new Map<string, UnsavedChoice>([
		['s', 'save'],
		['Enter', 'save'],
		['d', 'discard'],
		['c', 'cancel'],
		['Escape', 'cancel'],
	]);

	function handleKey(event: KeyboardEvent): void {
		const choice = KEYS.get(event.key);
		if (choice !== undefined) {
			event.preventDefault();
			event.stopPropagation();
			prompt.answer(choice);
		}
	}
</script>

<Dialog.Root
	open={prompt.pending !== undefined}
	onOpenChange={(isOpen) => {
		if (!isOpen) {
			prompt.answer('cancel');
		}
	}}
>
	<Dialog.Portal>
		<Dialog.Overlay class="palette-overlay" />
		<Dialog.Content
			class="palette"
			aria-label="Unsaved changes"
			onkeydown={handleKey}
			escapeKeydownBehavior="ignore"
		>
			<p class="question">
				<strong>{prompt.pending?.title}</strong> has unsaved changes.
			</p>
			<footer>
				<button
					class="primary"
					onclick={() => {
						prompt.answer('save');
					}}
				>Save <kbd>s</kbd></button>
				<button
					onclick={() => {
						prompt.answer('discard');
					}}
				>Discard <kbd>d</kbd></button>
				<button
					onclick={() => {
						prompt.answer('cancel');
					}}
				>Cancel <kbd>Esc</kbd></button>
			</footer>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	.question {
		margin: 0;
		padding: 1rem 1rem 0.5rem;
	}

	footer {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
		padding: 0.6rem 1rem 0.9rem;
	}

	button {
		padding: 0.3rem 0.8rem;
		border: 1px solid var(--border);
		border-radius: 4px;
		background: none;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}

	button:hover {
		background: var(--hover);
	}

	.primary {
		border-color: var(--accent);
		color: var(--accent);
	}

	kbd {
		margin-left: 0.3rem;
		color: var(--muted);
		font-family: ui-monospace, monospace;
		font-size: 0.75rem;
	}
</style>
