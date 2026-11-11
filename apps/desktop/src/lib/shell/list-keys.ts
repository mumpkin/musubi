// SPDX-License-Identifier: GPL-3.0-or-later
// Keys of a list panel (explorer, backlinks) once it has the focus: `j` and
// `k` move between its items, `l` opens the item as `Enter` does, `Escape`
// goes back to the pane.

const STEPS = new Map([
	['j', 1],
	['ArrowDown', 1],
	['k', -1],
	['ArrowUp', -1],
]);

export interface ListPanel {
	// Focuses the current item, or else the first one.
	focusList: () => void;
}

// Focuses `item` and scrolls it into view smoothly.
function focusItem(item: HTMLElement | undefined): void {
	item?.focus({ preventScroll: true });
	item?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// Focuses the item matching `preferred`, or else the first one, or else
// the panel itself when it is empty: `Space h` and `Escape` still work.
export function focusFirst(
	container: HTMLElement | undefined,
	selector: string,
	preferred: string,
): void {
	const item = container?.querySelector<HTMLElement>(preferred)
		?? container?.querySelector<HTMLElement>(selector)
		?? container;
	focusItem(item);
}

interface ListKeys {
	container: HTMLElement | undefined;
	// The items that take the focus.
	selector: string;
	onLeave: () => void;
}

export function listKeydown(event: KeyboardEvent, list: ListKeys): void {
	if (event.ctrlKey || event.altKey || event.metaKey || !list.container) {
		return;
	}
	const items = [
		...list.container.querySelectorAll<HTMLElement>(list.selector),
	];
	const index = items.findIndex((item) => item === document.activeElement);
	const step = STEPS.get(event.key);
	if (step !== undefined) {
		const next = Math.min(Math.max(index + step, 0), items.length - 1);
		focusItem(items[next]);
	} else if (event.key === 'l') {
		items[index]?.click();
	} else if (event.key === 'Escape') {
		list.onLeave();
	} else {
		return;
	}
	event.preventDefault();
}
