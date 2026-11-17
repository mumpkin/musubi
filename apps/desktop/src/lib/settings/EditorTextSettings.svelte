<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- How the editor shows the source: font, size, wrapping of long lines,
     the line of the cursor, the width of indentation. -->
<script lang="ts">
	import type { DeviceSettings } from '../bindings/DeviceSettings.ts';
	import type { Preferences } from '../bindings/Preferences.ts';
	import { changePreferences, FONT_SIZE, INDENT_WIDTH } from './commands.ts';
	import FontSetting from './FontSetting.svelte';
	import NumberSetting from './NumberSetting.svelte';
	import SettingRow from './SettingRow.svelte';
	import SwitchSetting from './SwitchSetting.svelte';

	interface Props {
		settings: DeviceSettings;
		onSettings: (settings: DeviceSettings) => void;
		onError: (message: string) => void;
	}

	const { settings, onSettings, onError }: Props = $props();

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
	control="editor-font"
>
	<FontSetting
		id="editor-font"
		font={preferences.editorFont}
		onChange={(editorFont: string) => {
			change({ editorFont });
		}}
	/>
</SettingRow>
<SettingRow
	label="Text size"
	control="editor-size"
>
	<NumberSetting
		id="editor-size"
		value={preferences.editorFontSize}
		bounds={FONT_SIZE}
		unit="pixels"
		onChange={(editorFontSize: number) => {
			change({ editorFontSize });
		}}
	/>
</SettingRow>
<SettingRow
	label="Wrap long lines"
	description="Otherwise long lines scroll sideways."
	control="soft-wrap"
>
	<SwitchSetting
		id="soft-wrap"
		checked={preferences.softWrap}
		onChange={(softWrap: boolean) => {
			change({ softWrap });
		}}
	/>
</SettingRow>
<SettingRow
	label="Highlight the cursor line"
	control="cursor-line"
>
	<SwitchSetting
		id="cursor-line"
		checked={preferences.highlightCursorLine}
		onChange={(highlightCursorLine: boolean) => {
			change({ highlightCursorLine });
		}}
	/>
</SettingRow>
<SettingRow
	label="Indentation"
	description="Spaces of one level, for Tab and the indent commands."
	control="indent-width"
>
	<NumberSetting
		id="indent-width"
		value={preferences.indentWidth}
		bounds={INDENT_WIDTH}
		unit="spaces"
		onChange={(indentWidth: number) => {
			change({ indentWidth });
		}}
	/>
</SettingRow>
