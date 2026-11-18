<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Asks for the title of a new note or the name of a new folder. -->
<script lang="ts">
	import { Dialog } from 'bits-ui';

	import type { VaultTree } from '../bindings/VaultTree.ts';
	import { createEntry } from '../vault/vault.ts';

	interface Props {
		open: boolean;
		kind: 'note' | 'folder';
		folder: string;
		// The new tree, and the path of the note if one was created.
		onCreated: (tree: VaultTree, note: string | undefined) => void;
		onError: (message: string) => void;
	}

	let {
		open = $bindable(),
		kind,
		folder,
		onCreated,
		onError,
	}: Props = $props();

	let name = $state('');

	const label = $derived(kind === 'note' ? 'New note' : 'New folder');

	function submit(event: SubmitEvent): void {
		event.preventDefault();
		if (name.trim() === '') {
			return;
		}
		createEntry({ kind, folder, name: name.trim() })
			.then(({ tree, note }) => {
				onCreated(tree, note);
			})
			.catch((error: unknown) => {
				onError(String(error));
			});
		name = '';
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay class="palette-overlay" />
		<Dialog.Content
			class="palette"
			aria-label={label}
		>
			<form onsubmit={submit}>
				<label>
					<span class="heading">
						{label}{folder === '' ? '' : ` in ${folder}`}
					</span>
					<input
						class="palette-input"
						bind:value={name}
						placeholder={kind === 'note' ? 'Title, or Folder/Title' : 'Folder name'}
					/>
				</label>
			</form>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	.heading {
		display: block;
		padding: 0.6rem 1rem 0;
		color: var(--muted);
		font-size: 0.75rem;
		text-transform: uppercase;
	}
</style>
