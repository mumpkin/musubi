<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Lists what `:w` in the tree editor will do, as oil.nvim does: `y` or
     `Enter` applies it, `n` or `Escape` cancels. -->
<script lang="ts">
	import { Dialog } from 'bits-ui';

	import type { ChangeLine } from './tree-summary.ts';

	interface Props {
		// The changes waiting for an answer; the dialog shows while set.
		changes: ChangeLine[] | undefined;
		onAnswer: (isConfirmed: boolean) => void;
	}

	const { changes, onAnswer }: Props = $props();

	const YES = new Set(['y', 'Y', 'Enter']);
	const NO = new Set(['n', 'N', 'q', 'Escape']);

	function handleKey(event: KeyboardEvent): void {
		if (YES.has(event.key) || NO.has(event.key)) {
			event.preventDefault();
			event.stopPropagation();
			onAnswer(YES.has(event.key));
		}
	}
</script>

<Dialog.Root
	open={changes !== undefined}
	onOpenChange={(isOpen) => {
		if (!isOpen) {
			onAnswer(false);
		}
	}}
>
	<Dialog.Portal>
		<Dialog.Overlay class="palette-overlay" />
		<Dialog.Content
			class="palette"
			aria-label="Apply the changes"
			onkeydown={handleKey}
			escapeKeydownBehavior="ignore"
		>
			<p class="heading">Apply these changes?</p>
			<ul>
				{#each changes ?? [] as change, index (index)}
					<li>
						<span class="label {change.label.toLowerCase()}">
							{change.label}
						</span>
						<span class="text">{change.text}</span>
					</li>
				{/each}
			</ul>
			<footer>
				<button
					onclick={() => {
						onAnswer(true);
					}}
				>[Y]es</button>
				<button
					onclick={() => {
						onAnswer(false);
					}}
				>[N]o</button>
			</footer>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	.heading {
		margin: 0;
		padding: 0.6rem 1rem 0.3rem;
		color: var(--muted);
		font-size: 0.75rem;
		text-transform: uppercase;
	}

	ul {
		overflow: auto;
		max-height: 50vh;
		margin: 0;
		padding: 0 1rem;
		list-style: none;
		font-family: ui-monospace, 'DejaVu Sans Mono', monospace;
		font-size: 0.85rem;
	}

	li {
		display: flex;
		gap: 0.75rem;
		padding: 0.15rem 0;
	}

	.label {
		flex: none;
		width: 4.5rem;
		font-weight: 600;
	}

	.create {
		color: var(--accent);
	}

	.trash {
		color: var(--error);
	}

	.move,
	.rename {
		color: var(--warning);
	}

	.text {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	footer {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
		padding: 0.6rem 1rem;
	}

	button {
		padding: 0.25rem 0.75rem;
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
</style>
