// SPDX-License-Identifier: GPL-3.0-or-later
// Block cursor of the reading view: rendered elements carry the index of
// their source block in `data-block`.

const BLOCK_SELECTOR = '[data-block]';

// Indices of the blocks shown in `container`, in reading order. Blocks that
// render nothing (`#import`, `#set`) are absent.
export function renderedBlocks(container: Element): number[] {
	const indices = [...container.querySelectorAll<HTMLElement>(BLOCK_SELECTOR)]
		.map((element) => Number(element.dataset.block));
	return [...new Set(indices)];
}

// Block reached by moving `step` blocks from `current`, staying in bounds.
// Without a current block, moving down selects the first block and moving
// up the last one.
export function moveCursor(
	blocks: readonly number[],
	current: number | undefined,
	step: number,
): number | undefined {
	if (blocks.length === 0) {
		return undefined;
	}
	const position = current === undefined ? -1 : blocks.indexOf(current);
	if (position === -1) {
		return step > 0 ? blocks[0] : blocks.at(-1);
	}
	const target = Math.min(Math.max(position + step, 0), blocks.length - 1);
	return blocks[target];
}

// Block of the element under the pointer, if any.
export function blockAt(element: Element): number | undefined {
	const block = element.closest<HTMLElement>(BLOCK_SELECTOR);
	return block ? Number(block.dataset.block) : undefined;
}

// The rendered block to show for source line `line` (from 0): the one
// that contains it, or the last one before it.
export function blockForLine(
	blocks: readonly { startLine: number; endLine: number }[],
	rendered: readonly number[],
	line: number,
): number | undefined {
	let found: number | undefined;
	for (const index of rendered) {
		const block = blocks[index];
		if (block && block.startLine <= line) {
			found = index;
		}
		if (block && block.startLine <= line && line <= block.endLine) {
			return index;
		}
	}
	return found ?? rendered[0];
}

// How selecting a block scrolls: animated for moves of the cursor, at once
// when a note opens on a block, not at all when the caller scrolls.
export type BlockScroll = 'smooth' | 'instant' | 'none';

export function highlightBlock(
	container: Element,
	block: number | undefined,
	scroll: BlockScroll = 'smooth',
): void {
	for (const element of container.querySelectorAll('.selected-block')) {
		element.classList.remove('selected-block');
	}
	if (block === undefined) {
		return;
	}
	const elements = container.querySelectorAll(`[data-block="${String(block)}"]`);
	for (const element of elements) {
		element.classList.add('selected-block');
	}
	if (scroll !== 'none') {
		elements[0]?.scrollIntoView(scroll === 'smooth'
			? { block: 'nearest', behavior: 'smooth' }
			: { block: 'center' });
	}
}
