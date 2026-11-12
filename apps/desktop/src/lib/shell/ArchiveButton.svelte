<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- The button of an explorer row that archives its note or folder, or puts
     it back when it is in the archive. It shows on hover. -->
<script lang="ts">
	import { isArchived } from '../vault/tree.ts';
	import Icon from './Icon.svelte';

	interface Props {
		path: string;
		name: string;
		onArchive: (path: string) => void;
	}

	const { path, name, onArchive }: Props = $props();

	const isInArchive = $derived(isArchived(path));
</script>

<button
	class="add"
	title={isInArchive ? `Unarchive ${name}` : `Archive ${name}`}
	onclick={() => {
		onArchive(path);
	}}
><Icon name={isInArchive ? 'unarchive' : 'archive'} /></button>
