<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- The flashcard section of the settings: how many new cards a review
     brings each day, on this device. -->
<script lang="ts">
	import type { DeviceSettings } from '../bindings/DeviceSettings.ts';
	import { NEW_CARDS_PER_DAY, setNewCardsPerDay } from './commands.ts';
	import NumberSetting from './NumberSetting.svelte';
	import SettingRow from './SettingRow.svelte';

	interface Props {
		settings: DeviceSettings;
		onSettings: (settings: DeviceSettings) => void;
		onError: (message: string) => void;
	}

	const { settings, onSettings, onError }: Props = $props();

	const report = (error: unknown): void => {
		onError(String(error));
	};
</script>

<SettingRow
	label="New cards a day"
	description="The most cards never reviewed that a day of review brings in."
	control="new-cards"
>
	<NumberSetting
		id="new-cards"
		value={settings.newCardsPerDay}
		bounds={NEW_CARDS_PER_DAY}
		unit="cards"
		onChange={(count: number) => {
			setNewCardsPerDay(count).then(onSettings).catch(report);
		}}
	/>
</SettingRow>
