// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import { neighbourPanel, panelOrder } from './panel-focus.ts';

describe('panelOrder', () => {
	it('lists the panels from left to right, folded ones skipped', () => {
		expect(panelOrder({
			paneCount: 2,
			isExplorerOpen: true,
			isBacklinksOpen: true,
		})).toEqual(['explorer', 0, 1, 'backlinks']);
		expect(panelOrder({
			paneCount: 1,
			isExplorerOpen: false,
			isBacklinksOpen: true,
		})).toEqual([0, 'backlinks']);
	});
});

describe('neighbourPanel', () => {
	const order = panelOrder({
		paneCount: 1,
		isExplorerOpen: true,
		isBacklinksOpen: true,
	});

	it('moves left and right', () => {
		expect(neighbourPanel(order, 0, -1)).toBe('explorer');
		expect(neighbourPanel(order, 0, 1)).toBe('backlinks');
		expect(neighbourPanel(order, 'explorer', 1)).toBe(0);
	});

	it('stops at the edges', () => {
		expect(neighbourPanel(order, 'explorer', -1)).toBeUndefined();
		expect(neighbourPanel(order, 'backlinks', 1)).toBeUndefined();
	});
});
