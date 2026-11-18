<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Asks what to do with a link to a missing note: open the note with a
     near name (`o`, `Enter`), point every link at it (`f`), create the
     missing note (`c`) or cancel (`Escape`). -->
<script lang="ts">
	import { Dialog } from 'bits-ui';

	import type {
		MissingLinkChoice,
		MissingLinkPrompt,
	} from './missing-link-prompt.svelte.ts';

	interface Props {
		prompt: MissingLinkPrompt;
		// The title of a note, by path.
		titleOf: (path: string) => string;
	}

	const { prompt, titleOf }: Props = $props();

	const question = $derived(prompt.pending);
	const KEYS = $derived(
		new Map<string, MissingLinkChoice>(question?.near === undefined
			? [['c', 'create'], ['Enter', 'create'], ['Escape', 'cancel']]
			: [
				['o', 'open'],
				['Enter', 'open'],
				['f', 'fix'],
				['c', 'create'],
				['Escape', 'cancel'],
			]),
	);

	function handleKey(event: KeyboardEvent): void {
		const choice = KEYS.get(event.key);
		if (choice !== undefined) {
			event.preventDefault();
			event.stopPropagation();
			prompt.answer(choice);
		}
	}

	const shown = (path: string): string => path.replace(/\.typ$/u, '');
</script>

<Dialog.Root
	open={question !== undefined}
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
			aria-label="Missing note"
			onkeydown={handleKey}
			escapeKeydownBehavior="ignore"
		>
			{#if question}
				<div class="question">
					<p>No note at <code>{shown(question.path)}</code>.</p>
					{#if question.near}
						<p>
							Did the link mean
							<strong>{titleOf(question.near)}</strong>
							(<code>{shown(question.near)}</code>)?
						</p>
					{:else if question.newFolder !== undefined}
						<p>
							Creating it also creates the folder
							<code>{question.newFolder}</code>.
						</p>
					{/if}
				</div>
				<footer>
					{#if question.near}
						<button
							class="primary"
							onclick={() => {
								prompt.answer('open');
							}}
						>Open it <kbd>o</kbd></button>
						<button
							onclick={() => {
								prompt.answer('fix');
							}}
						>Fix every link to it <kbd>f</kbd></button>
					{/if}
					<button
						class:primary={question.near === undefined}
						onclick={() => {
							prompt.answer('create');
						}}
					>Create the note <kbd>c</kbd></button>
					<button
						onclick={() => {
							prompt.answer('cancel');
						}}
					>Cancel <kbd>Esc</kbd></button>
				</footer>
			{/if}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	.question {
		padding: 1rem 1rem 0.25rem;
	}

	.question p {
		margin: 0 0 0.5rem;
	}

	code {
		font-family: ui-monospace, monospace;
		font-size: 0.85em;
		overflow-wrap: anywhere;
	}

	footer {
		display: flex;
		flex-wrap: wrap;
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
