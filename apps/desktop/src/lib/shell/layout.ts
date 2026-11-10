// SPDX-License-Identifier: GPL-3.0-or-later
// Sizes of the panes, in percent of the window width, and interface delays.

export const PANE_SIZES = {
	explorer: { default: 18, min: 12 },
	main: { default: 62, min: 30 },
	backlinks: { default: 20, min: 14 },
	// The two panes inside the main area.
	half: { default: 50, min: 20 },
};

export const TOOLTIP_DELAY_MILLISECONDS = 400;
export const TOOLTIP_OFFSET_PIXELS = 4;
