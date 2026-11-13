<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- Settings: the vault, the theme and autosave belong to this device, the
     trash retention to the vault. Every change applies at once. -->
<script lang="ts">
	import { Dialog, Switch } from 'bits-ui';

	import type { DeviceSettings } from '../bindings/DeviceSettings.ts';
	import {
		AUTOSAVE_DELAY,
		boundedNumber,
		setAutosave,
		setTrashRetention,
		setTrashSection,
		TRASH_RETENTION,
	} from './commands.ts';
	import ThemeSetting from './ThemeSetting.svelte';
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

	function saveAutosave(enabled: boolean, delay: number): void {
		setAutosave(enabled, delay).then(onSettings).catch((error: unknown) => {
			onError(String(error));
		});
	}

	function toggleAutosave(enabled: boolean): void {
		if (settings) {
			saveAutosave(enabled, settings.autosaveDelaySeconds);
		}
	}

	function showTrashSection(show: boolean): void {
		setTrashSection(show).then(onSettings).catch((error: unknown) => {
			onError(String(error));
		});
	}

	function changeDelay(input: HTMLInputElement): void {
		const delay = boundedNumber(input.value, AUTOSAVE_DELAY);
		if (delay === undefined || !settings) {
			input.value = String(settings?.autosaveDelaySeconds ?? '');
			return;
		}
		saveAutosave(settings.autosave, delay);
	}

	function changeRetention(input: HTMLInputElement): void {
		const days = boundedNumber(input.value, TRASH_RETENTION);
		if (days === undefined) {
			input.value = String(trashRetentionDays);
			return;
		}
		setTrashRetention(days)
			.then(() => {
				trashRetentionDays = days;
			})
			.catch((error: unknown) => {
				onError(String(error));
			});
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay class="palette-overlay" />
		<Dialog.Content
			class="palette settings"
			aria-label="Settings"
		>
			<header>
				<Dialog.Title class="settings-title">Settings</Dialog.Title>
			</header>
			<VaultSetting
				root={vaultRoot}
				onOpen={onVault}
				{onError}
			/>
			<ThemeSetting {onError} />
			{#if settings}
				<section aria-labelledby="editor-heading">
					<h3 id="editor-heading">Editor</h3>
					<label class="line">
						<Switch.Root
							class="switch"
							checked={settings.autosave}
							onCheckedChange={(checked) => {
								toggleAutosave(checked);
							}}
						>
							<Switch.Thumb class="thumb" />
						</Switch.Root>
						Save automatically
					</label>
					<label class="line">
						After
						<input
							type="number"
							min={AUTOSAVE_DELAY.min}
							max={AUTOSAVE_DELAY.max}
							value={settings.autosaveDelaySeconds}
							disabled={!settings.autosave}
							onchange={(event) => {
								changeDelay(event.currentTarget);
							}}
						/>
						seconds without typing
					</label>
				</section>
			{/if}
			<section aria-labelledby="trash-heading">
				<h3 id="trash-heading">Trash</h3>
				{#if settings}
					<label class="line">
						<Switch.Root
							class="switch"
							checked={settings.showTrashSection}
							onCheckedChange={showTrashSection}
						>
							<Switch.Thumb class="thumb" />
						</Switch.Root>
						Show the trash in the explorer
					</label>
				{/if}
				<label class="line">
					Keep deleted notes of this vault
					<input
						type="number"
						min={TRASH_RETENTION.min}
						max={TRASH_RETENTION.max}
						value={trashRetentionDays}
						disabled={isReadOnly}
						onchange={(event) => {
							changeRetention(event.currentTarget);
						}}
					/>
					days (0: keep them)
				</label>
			</section>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	header {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--border);
	}

	:global(.settings-title) {
		margin: 0;
		font-size: 1rem;
	}

	:global(.settings section) {
		padding: 0.5rem 1rem 0.75rem;
	}

	:global(.settings h3) {
		margin: 0.25rem 0 0.5rem;
		color: var(--muted);
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.line {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		padding: 0.25rem 0;
	}

	input {
		width: 4.5rem;
		padding: 0.2rem 0.4rem;
		border: 1px solid var(--border);
		border-radius: 4px;
		background: var(--background);
		color: inherit;
		font: inherit;
	}

	input:disabled {
		color: var(--muted);
	}

	:global(.settings button:not(.choice, .switch)) {
		padding: 0.2rem 0.6rem;
		border: 1px solid var(--border);
		border-radius: 4px;
		background: var(--background);
		color: inherit;
		font: inherit;
		font-size: 0.85rem;
		cursor: pointer;
	}

	:global(.settings button:not(.choice, .switch):hover) {
		background: var(--hover);
	}

	:global(.settings .danger) {
		color: var(--error);
	}

	:global(.switch) {
		display: inline-flex;
		align-items: center;
		width: 2rem;
		height: 1.1rem;
		padding: 0.1rem;
		border: none;
		border-radius: 1rem;
		background: var(--border);
		cursor: pointer;
	}

	:global(.switch[data-state='checked']) {
		background: var(--accent);
	}

	:global(.switch:focus-visible) {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	:global(.thumb) {
		display: block;
		width: 0.9rem;
		height: 0.9rem;
		border-radius: 50%;
		background: var(--background);
		transition: transform 0.15s;
	}

	:global(.thumb[data-state='checked']) {
		transform: translateX(0.9rem);
	}
</style>
