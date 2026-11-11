// SPDX-License-Identifier: GPL-3.0-or-later
// Helix navigation in the reading view. Keys resolve to the commands of the
// editor's registry; the reading view runs the navigation ones on blocks:
// `j` / `k`, `gg` / `ge` / `G`, `/` / `?` / `n` / `N`, `zz` / `zt` / `zb`
// and page scrolling. Every scroll is smooth.
import type { CommandName } from '@musubi/editor';

import { blockAt, blockForLine, moveCursor } from './block-cursor.ts';
import { clearMatches, findMatches, showMatches } from './text-search.ts';

export interface ReadingSurface {
	// The rendered note.
	container: HTMLElement;
	// The element that scrolls.
	scroller: HTMLElement;
	// Indices of the rendered blocks, in reading order.
	blocks: () => number[];
	// Source lines of every block, by index.
	sourceBlocks: () => readonly { startLine: number; endLine: number }[];
	selected: () => number | undefined;
	// Selects a block; `scroll` brings it into view.
	select: (block: number | undefined, scroll: boolean) => void;
	openPrompt: (kind: 'search' | 'reverseSearch') => void;
}

const HALF = 0.5;
const PAGE_FRACTIONS = new Map<CommandName, number>([
	['pageCursorHalfDown', HALF],
	['pageCursorHalfUp', -HALF],
	['pageDown', 1],
	['pageUp', -1],
]);
const ALIGNMENTS = new Map<CommandName, ScrollLogicalPosition>([
	['alignViewCenter', 'center'],
	['alignViewTop', 'start'],
	['alignViewBottom', 'end'],
]);

function elementOf(container: Element, block: number): HTMLElement | null {
	return container.querySelector(`[data-block="${String(block)}"]`);
}

export class ReadingNavigator {
	private matches: Range[] = [];
	private current = -1;

	constructor(private readonly surface: ReadingSurface) {}

	// Runs `name` if the reading view knows it; returns whether it did.
	run(name: CommandName, count?: number): boolean {
		const page = PAGE_FRACTIONS.get(name);
		const alignment = ALIGNMENTS.get(name);
		if (page !== undefined) {
			this.page(page);
		} else if (alignment !== undefined) {
			this.align(alignment);
		} else {
			return this.runMove(name, count);
		}
		return true;
	}

	private runMove(name: CommandName, count: number | undefined): boolean {
		const steps = count ?? 1;
		const moves: Partial<Record<CommandName, () => void>> = {
			moveLineDown: () => {
				this.step(steps);
			},
			moveLineUp: () => {
				this.step(-steps);
			},
			gotoFileStart: () => {
				this.gotoLine(count ?? 1);
			},
			gotoLastLine: () => {
				this.surface.select(this.surface.blocks().at(-1), true);
			},
			gotoLine: () => {
				if (count !== undefined) {
					this.gotoLine(count);
				}
			},
			searchForward: () => {
				this.surface.openPrompt('search');
			},
			searchBackward: () => {
				this.surface.openPrompt('reverseSearch');
			},
			searchNext: () => {
				this.next(steps);
			},
			searchPrevious: () => {
				this.next(-steps);
			},
		};
		const move = moves[name];
		move?.();
		return move !== undefined;
	}

	private step(steps: number): void {
		const { surface } = this;
		const block = moveCursor(surface.blocks(), surface.selected(), steps);
		surface.select(block, true);
	}

	// The block of source line `number` (from 1).
	private gotoLine(number: number): void {
		const { surface } = this;
		const block = blockForLine(
			surface.sourceBlocks(),
			surface.blocks(),
			number - 1,
		);
		surface.select(block, true);
	}

	// Scrolls by a part of the screen; the cursor moves to the block found
	// as far down (or up), so that it stays at the same place on screen.
	private page(fraction: number): void {
		const { surface } = this;
		const distance = surface.scroller.clientHeight * fraction;
		const selected = surface.selected();
		const element = selected === undefined
			? null
			: elementOf(surface.container, selected);
		if (element) {
			const goal = element.getBoundingClientRect().top + distance;
			const gap = (block: number): number => {
				const found = elementOf(surface.container, block);
				const top = found?.getBoundingClientRect().top ?? Infinity;
				return Math.abs(top - goal);
			};
			const nearest = surface.blocks().reduce(
				(best, block) => (gap(block) < gap(best) ? block : best),
				selected ?? 0,
			);
			surface.select(nearest, false);
		}
		surface.scroller.scrollBy({ top: distance, behavior: 'smooth' });
	}

	private align(alignment: ScrollLogicalPosition): void {
		const selected = this.surface.selected();
		const element = selected === undefined
			? null
			: elementOf(this.surface.container, selected);
		element?.scrollIntoView({ block: alignment, behavior: 'smooth' });
	}

	// What `/` and `?` run on the typed pattern.
	search(pattern: string, isForward: boolean): void {
		this.matches = findMatches(this.surface.container, pattern);
		const blocks = this.surface.blocks();
		const selected = this.surface.selected();
		const position = selected === undefined ? -1 : blocks.indexOf(selected);
		const order = (range: Range): number => {
			const block = range.startContainer.parentElement
				? blockAt(range.startContainer.parentElement)
				: undefined;
			return block === undefined ? -1 : blocks.indexOf(block);
		};
		const after = this.matches.findIndex((range) =>
			order(range) > position);
		const before = this.matches.findLastIndex((range) =>
			order(range) < position);
		const wrapped = isForward ? 0 : this.matches.length - 1;
		const first = isForward ? after : before;
		this.current = -1;
		this.show(first === -1 ? wrapped : first);
	}

	// `n` and `N`: the next or previous match, wrapping around.
	private next(steps: number): void {
		if (this.matches.length > 0) {
			const count = this.matches.length;
			this.show((((this.current + steps) % count) + count) % count);
		}
	}

	private show(index: number): void {
		const range = this.matches[index];
		showMatches(this.matches, range);
		if (!range) {
			return;
		}
		this.current = index;
		const element = range.startContainer.parentElement;
		if (element) {
			this.surface.select(blockAt(element), false);
			element.scrollIntoView({ block: 'center', behavior: 'smooth' });
		}
	}

	// Removes the highlights of the search.
	clear(): void {
		this.matches = [];
		this.current = -1;
		clearMatches();
	}
}
