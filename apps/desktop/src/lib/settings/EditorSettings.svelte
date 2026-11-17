<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- The editor section of the settings, on this device: autosave and its
     delay, relative line numbers. -->
<script lang="ts">
	import type { DeviceSettings } from '../bindings/DeviceSettings.ts';
	import {
		AUTOSAVE_DELAY,
		setAutosave,
		setRelativeLineNumbers,
	} from './commands.ts';
	import NumberSetting from './NumberSetting.svelte';
	import SettingRow from './SettingRow.svelte';
	import SwitchSetting from './SwitchSetting.svelte';

	interface Props {
		settings: DeviceSettings;
		onSettings: (settings: DeviceSettings) => void;
		onError: (message: string) => void;
	}

	const { settings, onSettings, onError }: Props = $props();

	const RELATIVE = 'Number lines from the cursor, as Helix does, to jump '
		+ 'with counts.';

	function apply(change: Promise<DeviceSettings>): void {
		change.then(onSettings).catch((error: unknown) => {
			onError(String(error));
		});
	}
</script>

<SettingRow
	label="Save automatically"
	description="Save the note after a pause in typing, as well as with :w."
	control="autosave"
>
	<SwitchSetting
		id="autosave"
		checked={settings.autosave}
		onChange={(checked: boolean) => {
			apply(setAutosave(checked, settings.autosaveDelaySeconds));
		}}
	/>
</SettingRow>
<SettingRow
	label="Pause before saving"
	description="How long typing stops before the note is saved."
	control="autosave-delay"
>
	<NumberSetting
		id="autosave-delay"
		value={settings.autosaveDelaySeconds}
		bounds={AUTOSAVE_DELAY}
		unit="seconds"
		isDisabled={!settings.autosave}
		onChange={(delay: number) => {
			apply(setAutosave(settings.autosave, delay));
		}}
	/>
</SettingRow>
<SettingRow
	label="Relative line numbers"
	description={RELATIVE}
	control="relative-numbers"
>
	<SwitchSetting
		id="relative-numbers"
		checked={settings.relativeLineNumbers}
		onChange={(relative: boolean) => {
			apply(setRelativeLineNumbers(relative));
		}}
	/>
</SettingRow>
