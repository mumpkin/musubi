<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- The trash settings: showing it in the explorer (this device) and how
     long deleted notes are kept (this vault). -->
<script lang="ts">
	import type { DeviceSettings } from '../bindings/DeviceSettings.ts';
	import {
		setTrashRetention,
		setTrashSection,
		TRASH_RETENTION,
	} from './commands.ts';
	import NumberSetting from './NumberSetting.svelte';
	import SettingRow from './SettingRow.svelte';
	import SwitchSetting from './SwitchSetting.svelte';

	interface Props {
		settings: DeviceSettings | undefined;
		trashRetentionDays: number;
		isReadOnly: boolean;
		onSettings: (settings: DeviceSettings) => void;
		onError: (message: string) => void;
	}

	let {
		settings,
		trashRetentionDays = $bindable(),
		isReadOnly,
		onSettings,
		onError,
	}: Props = $props();

	const RETENTION = 'Days before notes in the trash of this vault are '
		+ 'deleted for good; 0 keeps them.';

	const report = (error: unknown): void => {
		onError(String(error));
	};
</script>

{#if settings}
	<SettingRow
		label="Show the trash"
		description="A Trash section at the bottom of the explorer."
		control="trash-section"
	>
		<SwitchSetting
			id="trash-section"
			checked={settings.showTrashSection}
			onChange={(show: boolean) => {
				setTrashSection(show).then(onSettings).catch(report);
			}}
		/>
	</SettingRow>
{/if}
<SettingRow
	label="Keep deleted notes"
	description={RETENTION}
	control="trash-retention"
>
	<NumberSetting
		id="trash-retention"
		value={trashRetentionDays}
		bounds={TRASH_RETENTION}
		unit="days"
		isDisabled={isReadOnly}
		onChange={(days: number) => {
			setTrashRetention(days)
				.then(() => {
					trashRetentionDays = days;
				})
				.catch(report);
		}}
	/>
</SettingRow>
