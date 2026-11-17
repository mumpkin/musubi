<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- The icons of the interface, from Lucide (ISC licence). Each one is
     imported by itself, so that only the icons used are bundled. They all
     share one size and stroke width, and take the colour of the text. -->
<script lang="ts">
	import Archive from '@lucide/svelte/icons/archive';
	import ArchiveArrowUp from '@lucide/svelte/icons/archive-arrow-up';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Circle from '@lucide/svelte/icons/circle';
	import Clock from '@lucide/svelte/icons/clock';
	import Columns2 from '@lucide/svelte/icons/columns-2';
	import Command from '@lucide/svelte/icons/command';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import FilePlus from '@lucide/svelte/icons/file-plus';
	import FolderPlus from '@lucide/svelte/icons/folder-plus';
	import Cards from '@lucide/svelte/icons/gallery-vertical-end';
	import GitCompare from '@lucide/svelte/icons/git-compare';
	import House from '@lucide/svelte/icons/house';
	import Minus from '@lucide/svelte/icons/minus';
	import Notebook from '@lucide/svelte/icons/notebook';
	import PanelLeft from '@lucide/svelte/icons/panel-left';
	import PanelRight from '@lucide/svelte/icons/panel-right';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Pin from '@lucide/svelte/icons/pin';
	import Search from '@lucide/svelte/icons/search';
	import Settings from '@lucide/svelte/icons/settings';
	import Square from '@lucide/svelte/icons/square';
	import TextSearch from '@lucide/svelte/icons/text-search';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Waypoints from '@lucide/svelte/icons/waypoints';
	import Cross from '@lucide/svelte/icons/x';

	import type { IconName } from './actions.ts';

	interface Props {
		name: IconName;
	}

	const { name }: Props = $props();

	const ICONS = {
		edit: Pencil,
		read: BookOpen,
		split: Columns2,
		close: Cross,
		trash: Trash2,
		newNote: FilePlus,
		newFolder: FolderPlus,
		folded: ChevronRight,
		unfolded: ChevronDown,
		minimize: Minus,
		maximize: Square,
		modified: Circle,
		pin: Pin,
		recent: Clock,
		notebook: Notebook,
		archive: Archive,
		unarchive: ArchiveArrowUp,
		cards: Cards,
		more: Ellipsis,
		conflict: GitCompare,
		explorer: PanelLeft,
		backlinks: PanelRight,
		find: Search,
		searchText: TextSearch,
		home: House,
		graph: Waypoints,
		commands: Command,
		settings: Settings,
	} as const;

	const SIZE_PIXELS = 15;
	const STROKE_WIDTH = 1.75;

	// Svelte needs a capitalised name to render a component held in a value.
	// eslint-disable-next-line @typescript-eslint/naming-convention
	const Component = $derived(ICONS[name]);
</script>

<Component
	class="icon"
	size={SIZE_PIXELS}
	strokeWidth={STROKE_WIDTH}
	aria-hidden="true"
/>
