<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Settings, in sections listed on the left: the arrows move between
     them, Tab goes to their settings. The theme, the editor, flashcards and
     the vaults belong to this device, the trash retention to the vault.
     Every change applies at once. -->
<script lang="ts">
	import { Dialog, Tabs } from 'bits-ui';

	import type { DeviceSettings } from '../bindings/DeviceSettings.ts';
	import Icon from '../shell/Icon.svelte';
	import CardSetting from './CardSetting.svelte';
	import EditorSettings from './EditorSettings.svelte';
	import ThemeSetting from './ThemeSetting.svelte';
	import TrashSettings from './TrashSettings.svelte';
	import VaultSetting from './VaultSetting.svelte';

	interface Props {
		open: boolean;
		settings: DeviceSettings | undefined;
		trashRetentionDays: number;
		isReadOnly: boolean;
		// Root of the open vault.
		vaultRoot: string;
		// Opens another vault, from its folder.
		onVault: (folder: string) => void;
		onSettings: (settings: DeviceSettings) => void;
		onError: (message: string) => void;
	}

	let {
		open = $bindable(),
		settings,
		trashRetentionDays = $bindable(),
		isReadOnly,
		vaultRoot,
		onVault,
		onSettings,
		onError,
	}: Props = $props();

	const SECTIONS = [
		{ id: 'appearance', label: 'Appearance' },
		{ id: 'editor', label: 'Editor' },
		{ id: 'flashcards', label: 'Flashcards' },
		{ id: 'files', label: 'Vaults and trash' },
	] as const;

	let section = $state<string>('appearance');

	// The dialog opens on its list of sections, ready for the arrows.
	function focusSection(event: Event): void {
		event.preventDefault();
		const active = document.querySelector<HTMLElement>(
			'.settings-section[data-state="active"]',
		);
		active?.focus();
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay class="palette-overlay" />
		<Dialog.Content
			class="settings"
			aria-label="Settings"
			onOpenAutoFocus={focusSection}
		>
			<header>
				<Dialog.Title class="settings-title">Settings</Dialog.Title>
				<Dialog.Close
					class="settings-close"
					aria-label="Close the settings"
				>
					<Icon name="close" />
				</Dialog.Close>
			</header>
			<Tabs.Root
				class="settings-body"
				orientation="vertical"
				bind:value={section}
			>
				<Tabs.List class="settings-sections">
					{#each SECTIONS as { id, label } (id)}
						<Tabs.Trigger
							class="settings-section"
							value={id}
						>{label}</Tabs.Trigger>
					{/each}
				</Tabs.List>
				<Tabs.Content
					class="settings-page"
					value="appearance"
				>
					<h3>Theme</h3>
					<ThemeSetting {onError} />
				</Tabs.Content>
				<Tabs.Content
					class="settings-page"
					value="editor"
				>
					<h3>Editor</h3>
					{#if settings}
						<EditorSettings
							{settings}
							{onSettings}
							{onError}
						/>
					{/if}
				</Tabs.Content>
				<Tabs.Content
					class="settings-page"
					value="flashcards"
				>
					<h3>Review</h3>
					{#if settings}
						<CardSetting
							{settings}
							{onSettings}
							{onError}
						/>
					{/if}
				</Tabs.Content>
				<Tabs.Content
					class="settings-page"
					value="files"
				>
					<h3>Vaults</h3>
					<VaultSetting
						root={vaultRoot}
						onOpen={onVault}
						{onError}
					/>
					<h3>Trash</h3>
					<TrashSettings
						{settings}
						bind:trashRetentionDays
						{isReadOnly}
						{onSettings}
						{onError}
					/>
				</Tabs.Content>
			</Tabs.Root>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	:global(.settings) {
		position: fixed;
		top: 50%;
		left: 50%;
		z-index: 50;
		display: grid;
		grid-template-rows: auto 1fr;
		width: min(48rem, 92vw);
		height: min(34rem, 86vh);
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: 10px;
		background: var(--background);
		box-shadow: 0 12px 40px rgb(0 0 0 / 25%);
		color: var(--foreground);
		transform: translate(-50%, -50%);
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.6rem 0.75rem 0.6rem 1.25rem;
		border-bottom: 1px solid var(--border);
	}

	:global(.settings-title) {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
	}

	:global(.settings-close) {
		display: inline-flex;
		padding: 0.3rem;
		border: none;
		border-radius: 4px;
		background: none;
		color: var(--muted);
		cursor: pointer;
	}

	:global(.settings-close:hover),
	:global(.settings-close:focus-visible) {
		outline: none;
		background: var(--hover);
		color: var(--foreground);
	}

	:global(.settings-body) {
		display: grid;
		grid-template-columns: 11rem 1fr;
		min-height: 0;
	}

	:global(.settings-sections) {
		display: grid;
		align-content: start;
		gap: 0.15rem;
		padding: 0.75rem 0.5rem;
		border-right: 1px solid var(--border);
		background: var(--surface);
	}

	:global(.settings-section) {
		padding: 0.4rem 0.75rem;
		border: none;
		border-radius: 5px;
		background: none;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	:global(.settings-section:hover) {
		background: var(--hover);
	}

	:global(.settings-section[data-state='active']) {
		background: var(--selection);
		font-weight: 600;
	}

	:global(.settings-section:focus-visible) {
		outline: 2px solid var(--accent);
		outline-offset: -2px;
	}

	:global(.settings-page) {
		overflow-y: auto;
		padding: 0.5rem 1.5rem 1.25rem;
		outline: none;
	}

	:global(.settings-page h3) {
		margin: 1rem 0 0.25rem;
		color: var(--muted);
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	:global(.settings-page h3:first-child) {
		margin-bottom: 0.75rem;
	}

	:global(.settings .button) {
		padding: 0.3rem 0.75rem;
		border: 1px solid var(--border);
		border-radius: 5px;
		background: var(--background);
		color: inherit;
		font: inherit;
		font-size: 0.85rem;
		cursor: pointer;
	}

	:global(.settings .button:hover),
	:global(.settings .button:focus-visible) {
		outline: none;
		background: var(--hover);
	}

	:global(.settings .danger) {
		color: var(--error);
	}
</style>
