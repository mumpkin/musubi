<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Prototype: the Helix editor on the demo note. `:w` and `:q` only show a
     message: saving comes with the vault. -->
<script lang="ts">
	import demoNote from '../../../../../examples/demo-vault/Demo.typ?raw';
	import HelixEditor from './HelixEditor.svelte';

	let message = $state('Normal mode: h j k l, w b e, x, d c y p, u U, C, s, :w, :q');

	function write(text: string): void {
		message = `:w — would save ${String(text.length)} characters`;
	}

	function quit(): void {
		message = ':q — would close the pane';
	}
</script>

<div class="editor-demo">
	<p class="message">{message}</p>
	<HelixEditor
		text={demoNote}
		onWrite={write}
		onQuit={quit}
	/>
</div>

<style>
	.editor-demo {
		display: grid;
		grid-template-rows: auto 1fr;
		height: 100%;
		min-height: 0;
	}

	.message {
		margin: 0;
		padding: 0.4rem 1rem;
		border-bottom: 1px solid var(--border);
		color: var(--muted);
		font-size: 0.85rem;
	}
</style>
