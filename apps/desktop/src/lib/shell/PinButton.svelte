<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- The button of an explorer row that pins or unpins its note. It shows
     on hover, filled when the note is pinned. -->
<script lang="ts">
	import type { NoteEntry } from '../bindings/NoteEntry.ts';
	import Icon from './Icon.svelte';

	interface Props {
		note: NoteEntry;
		isPinned: boolean;
		onPin: (path: string) => void;
	}

	const { note, isPinned, onPin }: Props = $props();
</script>

<button
	class="add"
	class:pinned={isPinned}
	title="{isPinned ? 'Unpin' : 'Pin'} {note.title}"
	onclick={() => {
		onPin(note.path);
	}}
><Icon name="pin" /></button>

<style>
	.pinned :global(svg) {
		fill: currentColor;
	}
</style>
