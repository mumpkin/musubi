<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- General preferences of this device: the size of the interface and
     what a vault opens on. -->
<script lang="ts">
	import type { DeviceSettings } from '../bindings/DeviceSettings.ts';
	import type { Preferences } from '../bindings/Preferences.ts';
	import type { StartScreen } from '../bindings/StartScreen.ts';
	import { changePreferences, INTERFACE_SCALES } from './commands.ts';
	import SelectSetting from './SelectSetting.svelte';
	import SettingRow from './SettingRow.svelte';

	interface Props {
		settings: DeviceSettings;
		onSettings: (settings: DeviceSettings) => void;
		onError: (message: string) => void;
	}

	const { settings, onSettings, onError }: Props = $props();

	const SCALES = Object.entries(INTERFACE_SCALES)
		.map(([label, value]) => ({ value, label }));
	const STARTS: { value: StartScreen; label: string }[] = [
		{ value: 'lastNote', label: 'The last note' },
		{ value: 'home', label: 'The home screen' },
	];

	function change(update: Partial<Preferences>): void {
		changePreferences(settings, update).then(onSettings).catch(
			(error: unknown) => {
				onError(String(error));
			},
		);
	}
</script>

<SettingRow
	label="Interface size"
	description="Zoom of the whole window: text, panels and icons."
	control="interface-scale"
>
	<SelectSetting
		id="interface-scale"
		value={settings.preferences.interfaceScale}
		choices={SCALES}
		onChange={(interfaceScale: number) => {
			change({ interfaceScale });
		}}
	/>
</SettingRow>
<SettingRow
	label="Open on"
	description="What a vault shows when Musubi starts."
	control="start-screen"
>
	<SelectSetting
		id="start-screen"
		value={settings.preferences.startScreen}
		choices={STARTS}
		onChange={(startScreen: StartScreen) => {
			change({ startScreen });
		}}
	/>
</SettingRow>
