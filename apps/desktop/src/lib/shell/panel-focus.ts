// SPDX-License-Identifier: GPL-3.0-or-later
// The panels of the window from left to right, for `Space h` and `Space l`:
// the explorer, the panes (by index) and the backlinks.

export type Panel = 'explorer' | 'backlinks' | number;

export interface PanelLayout {
	paneCount: number;
	isExplorerOpen: boolean;
	isBacklinksOpen: boolean;
}

// The panels that can take the focus: folded ones are skipped.
export function panelOrder(layout: PanelLayout): Panel[] {
	const panes = [...Array.from({ length: layout.paneCount }).keys()];
	return [
		...(layout.isExplorerOpen ? ['explorer' as const] : []),
		...panes,
		...(layout.isBacklinksOpen ? ['backlinks' as const] : []),
	];
}

// The panel `step` places away from `current`, or `undefined` past the
// edge: as in Helix, the focus does not wrap around.
export function neighbourPanel(
	order: Panel[],
	current: Panel,
	step: number,
): Panel | undefined {
	const index = order.indexOf(current);
	return index === -1 ? undefined : order[index + step];
}

// The panel holding `element`, the focused element of the page.
export function panelOf(element: Element | null): Panel | undefined {
	if (element?.closest('.explorer')) {
		return 'explorer';
	}
	if (element?.closest('.backlinks')) {
		return 'backlinks';
	}
	const pane = element?.closest('.pane');
	if (!pane) {
		return undefined;
	}
	return [...document.querySelectorAll('.pane')].indexOf(pane);
}
