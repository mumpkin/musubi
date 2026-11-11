// SPDX-License-Identifier: GPL-3.0-or-later
// The explorer and the backlinks on each side of the panes: fold them, and
// move the keyboard focus across every panel with `Space h` / `Space l`.
import type { PaneAPI } from 'paneforge';

import { toggle } from './layout.ts';
import type { ListPanel } from './list-keys.ts';
import type { PaneManager } from './pane-manager.svelte.ts';
import {
	neighbourPanel,
	type Panel,
	panelOf,
	panelOrder,
} from './panel-focus.ts';

export class SidePanels {
	explorer = $state<PaneAPI>();
	backlinks = $state<PaneAPI>();
	explorerList = $state<ListPanel>();
	backlinksList = $state<ListPanel>();

	private readonly manager: PaneManager;

	constructor(manager: PaneManager) {
		this.manager = manager;
	}

	toggleExplorer(): void {
		this.toggle(this.explorer, 'explorer');
	}

	toggleBacklinks(): void {
		this.toggle(this.backlinks, 'backlinks');
	}

	// `step` -1 focuses the panel on the left, 1 the one on the right.
	move(step: number): void {
		const order = panelOrder({
			paneCount: this.manager.panes.length,
			isExplorerOpen: this.explorer?.isCollapsed() === false,
			isBacklinksOpen: this.backlinks?.isCollapsed() === false,
		});
		const current = this.current();
		const next = neighbourPanel(order, current, step);
		if (next !== undefined) {
			this.focus(next);
		}
	}

	// `Escape` in a side panel: back to the pane that had the focus.
	back(): void {
		this.manager.focusPane(this.manager.focusedIndex);
	}

	// Whether the keyboard focus is in a pane, not in a side panel.
	isInPane(): boolean {
		return typeof this.current() === 'number';
	}

	private current(): Panel {
		return panelOf(document.activeElement) ?? this.manager.focusedIndex;
	}

	private focus(panel: Panel): void {
		if (panel === 'explorer') {
			this.explorerList?.focusList();
		} else if (panel === 'backlinks') {
			this.backlinksList?.focusList();
		} else {
			this.manager.focusPane(panel);
		}
	}

	// A panel folded while it has the focus gives it back to the pane.
	private toggle(pane: PaneAPI | undefined, panel: Panel): void {
		const hadFocus = this.current() === panel;
		toggle(pane);
		if (hadFocus && pane?.isCollapsed()) {
			this.back();
		}
	}
}
