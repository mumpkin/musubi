<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- How the graph opens: the shape of the notes and their grouping by
     folder, the same options as the panel of the graph. -->
<script lang="ts">
	import {
		graphOptions,
		type NodeShape,
	} from '../graph/graph-options.svelte.ts';
	import SelectSetting from './SelectSetting.svelte';
	import SettingRow from './SettingRow.svelte';
	import SwitchSetting from './SwitchSetting.svelte';

	const SHAPE = 'Dots with the title below, or pills with the title '
		+ 'inside; dots read better on large vaults.';
	const SHAPES: { value: NodeShape; label: string }[] = [
		{ value: 'dot', label: 'Dots' },
		{ value: 'pill', label: 'Pills' },
	];
</script>

<SettingRow
	label="Notes"
	description={SHAPE}
	control="graph-shape"
>
	<SelectSetting
		id="graph-shape"
		value={graphOptions.shape}
		choices={SHAPES}
		onChange={(shape: NodeShape) => {
			graphOptions.setShape(shape);
		}}
	/>
</SettingRow>
<SettingRow
	label="Group by folder"
	description="Each folder is a circle of its color around its notes."
	control="graph-groups"
>
	<SwitchSetting
		id="graph-groups"
		checked={graphOptions.isGrouped}
		onChange={(isGrouped: boolean) => {
			graphOptions.setGrouped(isGrouped);
		}}
	/>
</SettingRow>
