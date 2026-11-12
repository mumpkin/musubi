// SPDX-License-Identifier: GPL-3.0-or-later
// The links of the selected block, reached with `l` and `h` in the reading
// view; `Enter` follows the selected one as a click does.

const SELECTED = 'selected-link';

export class LinkCursor {
	private index: number | undefined;
	private readonly container: () => Element | undefined;

	constructor(container: () => Element | undefined) {
		this.container = container;
	}

	get isActive(): boolean {
		return this.index !== undefined;
	}

	// Selects the next (`step` 1) or the previous (-1) link of the selected
	// block. Whether the block has links.
	move(step: number): boolean {
		const links = this.links();
		if (links.length === 0) {
			return false;
		}
		// From no link, `l` starts at the first one and `h` at the last.
		const start = step > 0 ? -1 : links.length;
		const next = Math.min(
			Math.max((this.index ?? start) + step, 0),
			links.length - 1,
		);
		this.mark(links, next);
		return true;
	}

	// Follows the selected link. Whether there was one.
	follow(): boolean {
		const link = this.index === undefined
			? undefined
			: this.links()[this.index];
		link?.click();
		return link !== undefined;
	}

	clear(): void {
		this.index = undefined;
		for (const link of this.container()?.querySelectorAll(`.${SELECTED}`)
			?? []) {
			link.classList.remove(SELECTED);
		}
	}

	private links(): HTMLAnchorElement[] {
		const blocks = this.container()?.querySelectorAll('.selected-block');
		return [...blocks ?? []].flatMap((block) =>
			[...block.querySelectorAll<HTMLAnchorElement>('a[href]')]);
	}

	private mark(links: HTMLAnchorElement[], index: number): void {
		this.clear();
		this.index = index;
		const link = links[index];
		link?.classList.add(SELECTED);
		link?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	}
}
