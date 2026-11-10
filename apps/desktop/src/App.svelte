<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { fetchAppInfo, formatAppInfo } from './lib/app-info.ts';

	const appInfo = fetchAppInfo();
</script>

<main>
	<h1>Musubi</h1>
	{#await appInfo}
		<p class="muted">Loading…</p>
	{:then info}
		<p class="muted">{formatAppInfo(info)}</p>
	{:catch}
		<p class="muted">Running outside Tauri</p>
	{/await}
</main>

<style>
	main {
		display: grid;
		place-content: center;
		min-height: 100vh;
		text-align: center;
	}

	.muted {
		color: var(--muted);
	}
</style>
