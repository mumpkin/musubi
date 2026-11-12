<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- The context menu of the app, in place of the one of the webview: at
     the pointer for a right click, under the focused entry for the
     `ContextMenu` key or `Shift-F10`. `j` / `k` or the arrows move, `Enter`
     runs, `Escape` or a click elsewhere closes. -->
<script lang="ts">
	import { tick } from 'svelte';

	import type { MenuItem } from './explorer-menu.ts';
	import Icon from './Icon.svelte';

	interface OpenMenu {
		left: number;
		top: number;
		items: MenuItem[];
		// Gets the focus back when the menu closes.
		origin: HTMLElement | undefined;
	}

	let menu = $state<OpenMenu>();
	// The item waiting for a second activation.
	let confirming = $state<MenuItem>();
	let element = $state<HTMLElement>();

	const MARGIN_PIXELS = 4;

	// Where the menu opens: at the pointer, or under the entry for a
	// keyboard. WebKit gives a keyboard menu event no position.
	function anchor(event: Event, origin: HTMLElement | undefined) {
		const isPointer = event instanceof MouseEvent
			&& (event.clientX !== 0 || event.clientY !== 0);
		if (isPointer) {
			return { left: event.clientX, top: event.clientY };
		}
		const box = origin?.getBoundingClientRect();
		return { left: box?.left ?? 0, top: box?.bottom ?? 0 };
	}

	// Keeps the menu inside the window.
	async function fit(): Promise<void> {
		await tick();
		if (!element || !menu) {
			return;
		}
		const box = element.getBoundingClientRect();
		menu.left = Math.max(
			Math.min(menu.left, innerWidth - box.width - MARGIN_PIXELS),
			MARGIN_PIXELS,
		);
		menu.top = Math.max(
			Math.min(menu.top, innerHeight - box.height - MARGIN_PIXELS),
			MARGIN_PIXELS,
		);
		element.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
	}

	export function show(
		event: Event,
		items: MenuItem[],
		origin?: HTMLElement,
	): void {
		event.preventDefault();
		event.stopPropagation();
		menu = { ...anchor(event, origin), items, origin };
		confirming = undefined;
		fit().catch(() => undefined);
	}

	function close(): void {
		const origin = menu?.origin;
		menu = undefined;
		origin?.focus();
	}

	function activate(item: MenuItem): void {
		if (item.confirmation !== undefined && confirming !== item) {
			confirming = item;
			return;
		}
		close();
		item.run();
	}

	const STEPS = new Map([
		['j', 1],
		['ArrowDown', 1],
		['k', -1],
		['ArrowUp', -1],
	]);

	// A click elsewhere closes the menu.
	function closeOutside(event: PointerEvent): void {
		const { target } = event;
		const isInside = target instanceof Node && element?.contains(target);
		if (menu && !isInside) {
			menu = undefined;
		}
	}

	function handleKey(event: KeyboardEvent): void {
		// Keys must not reach the panels behind the menu. `Enter` clicks the
		// focused item.
		event.stopPropagation();
		const items = [
			...element?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? [],
		];
		const index = items.indexOf(document.activeElement as HTMLElement);
		const step = STEPS.get(event.key);
		if (step !== undefined) {
			const count = items.length;
			items[(index + step + count) % count]?.focus();
			event.preventDefault();
		} else if (event.key === 'Escape') {
			close();
			event.preventDefault();
		}
	}
</script>

<svelte:window
	onpointerdown={closeOutside}
	onblur={() => {
		menu = undefined;
	}}
/>

{#if menu}
	<div
		bind:this={element}
		class="context-menu"
		role="menu"
		tabindex="-1"
		style:left="{menu.left}px"
		style:top="{menu.top}px"
		onkeydowncapture={handleKey}
	>
		{#each menu.items as item (item.label)}
			<button
				role="menuitem"
				class:confirming={confirming === item}
				onclick={() => {
					activate(item);
				}}
			>
				<span class="icon">
					{#if item.icon}<Icon name={item.icon} />{/if}
				</span>
				{confirming === item ? item.confirmation : item.label}
			</button>
		{/each}
	</div>
{/if}

<style>
	.context-menu {
		position: fixed;
		z-index: 50;
		display: flex;
		flex-direction: column;
		min-width: 11rem;
		padding: 0.25rem;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--surface);
		box-shadow: 0 4px 16px rgb(0 0 0 / 15%);
		outline: none;
	}

	button {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		padding: 0.3rem 0.6rem;
		border: none;
		border-radius: 4px;
		background: none;
		color: inherit;
		font: inherit;
		font-size: 0.85rem;
		text-align: left;
		white-space: nowrap;
		cursor: pointer;
	}

	button:hover,
	button:focus-visible,
	button:focus {
		outline: none;
		background: var(--hover);
	}

	.icon {
		display: grid;
		place-items: center;
		width: 1rem;
		color: var(--muted);
	}

	.confirming {
		color: var(--error);
	}
</style>
