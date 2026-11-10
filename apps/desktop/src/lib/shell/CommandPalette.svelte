<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Command palette (Ctrl+P), built on the headless Dialog and Command
     components of Bits UI. -->
<script lang="ts">
	import { Command, Dialog } from 'bits-ui';

	import type { PaletteCommand } from './actions.ts';

	interface Props {
		open: boolean;
		commands: PaletteCommand[];
	}

	let { open = $bindable(), commands }: Props = $props();

	// Commands by group, in the order of their first command.
	const groups = $derived(
		[...new Set(commands.map((command) => command.group))].map((name) => ({
			name,
			commands: commands.filter((command) => command.group === name),
		})),
	);

	function run(command: PaletteCommand): void {
		open = false;
		command.run();
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay class="palette-overlay" />
		<Dialog.Content
			class="palette"
			aria-label="Command palette"
		>
			<Command.Root>
				<Command.Input
					class="palette-input"
					placeholder="Type a command or a note…"
				/>
				<Command.List class="palette-list">
					<Command.Empty class="palette-empty">
						No match.
					</Command.Empty>
					{#each groups as group (group.name)}
						<Command.Group>
							<Command.GroupHeading class="palette-heading">
								{group.name}
							</Command.GroupHeading>
							<Command.GroupItems>
								{#each group.commands as entry (entry.label)}
									<Command.Item
										class="palette-item"
										value={entry.label}
										onSelect={() => {
											run(entry);
										}}
									>
										<span>{entry.label}</span>
										{#if entry.shortcut}
											<kbd>{entry.shortcut}</kbd>
										{/if}
									</Command.Item>
								{/each}
							</Command.GroupItems>
						</Command.Group>
					{/each}
				</Command.List>
			</Command.Root>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	:global(.palette-overlay) {
		position: fixed;
		inset: 0;
		background: rgb(0 0 0 / 15%);
	}

	:global(.palette) {
		position: fixed;
		top: 15vh;
		left: 50%;
		width: min(36rem, 90vw);
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--background);
		box-shadow: 0 12px 32px rgb(0 0 0 / 18%);
		transform: translateX(-50%);
	}

	:global(.palette-input) {
		box-sizing: border-box;
		width: 100%;
		padding: 0.75rem 1rem;
		border: none;
		border-bottom: 1px solid var(--border);
		outline: none;
		background: none;
		color: inherit;
		font: inherit;
	}

	:global(.palette-list) {
		max-height: 50vh;
		overflow: auto;
		padding: 0.25rem;
	}

	:global(.palette-heading) {
		padding: 0.5rem 0.75rem 0.25rem;
		color: var(--muted);
		font-size: 0.75rem;
		text-transform: uppercase;
	}

	:global(.palette-item) {
		display: flex;
		justify-content: space-between;
		padding: 0.4rem 0.75rem;
		border-radius: 4px;
		cursor: pointer;
	}

	:global(.palette-item[data-selected]) {
		background: var(--selection);
	}

	:global(.palette-empty) {
		padding: 1rem;
		color: var(--muted);
	}

	kbd {
		color: var(--muted);
		font-family: ui-monospace, monospace;
		font-size: 0.8rem;
	}
</style>
