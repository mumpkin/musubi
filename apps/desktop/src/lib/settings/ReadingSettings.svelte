<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- How the reading view sets the notes: font, size, width of the lines
     and spacing between them. -->
<script lang="ts">
	import type { DeviceSettings } from '../bindings/DeviceSettings.ts';
	import type { Preferences } from '../bindings/Preferences.ts';
	import {
		changePreferences,
		FONT_SIZE,
		LINE_SPACINGS,
		READING_WIDTH,
	} from './commands.ts';
	import FontSetting from './FontSetting.svelte';
	import NumberSetting from './NumberSetting.svelte';
	import SelectSetting from './SelectSetting.svelte';
	import SettingRow from './SettingRow.svelte';

	interface Props {
		settings: DeviceSettings;
		onSettings: (settings: DeviceSettings) => void;
		onError: (message: string) => void;
	}

	const { settings, onSettings, onError }: Props = $props();

	const SPACINGS = Object.entries(LINE_SPACINGS).map(([name, value]) => ({
		value,
		label: name.charAt(0).toUpperCase() + name.slice(1),
	}));

	const preferences = $derived(settings.preferences);

	function change(update: Partial<Preferences>): void {
		changePreferences(settings, update).then(onSettings).catch(
			(error: unknown) => {
				onError(String(error));
			},
		);
	}
</script>

<SettingRow
	label="Font"
	description="The font of the text of the notes; titles follow it."
	control="reading-font"
>
	<FontSetting
		id="reading-font"
		font={preferences.readingFont}
		onChange={(readingFont: string) => {
			change({ readingFont });
		}}
	/>
</SettingRow>
<SettingRow
	label="Text size"
	control="reading-size"
>
	<NumberSetting
		id="reading-size"
		value={preferences.readingFontSize}
		bounds={FONT_SIZE}
		unit="pixels"
		onChange={(readingFontSize: number) => {
			change({ readingFontSize });
		}}
	/>
</SettingRow>
<SettingRow
	label="Line width"
	description="The longest line, beyond which the text wraps."
	control="reading-width"
>
	<NumberSetting
		id="reading-width"
		value={preferences.readingWidth}
		bounds={READING_WIDTH}
		unit="characters"
		onChange={(readingWidth: number) => {
			change({ readingWidth });
		}}
	/>
</SettingRow>
<SettingRow
	label="Line spacing"
	control="line-spacing"
>
	<SelectSetting
		id="line-spacing"
		value={preferences.lineSpacing}
		choices={SPACINGS}
		onChange={(lineSpacing: number) => {
			change({ lineSpacing });
		}}
	/>
</SettingRow>
