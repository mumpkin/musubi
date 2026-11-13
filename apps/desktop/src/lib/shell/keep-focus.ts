// SPDX-License-Identifier: GPL-3.0-or-later
// Keeps the keyboard on the same entry of a list when the list changes
// under it. Moving a focused element in the page (Recent reordered after a
// note changed on disk) drops its focus in WebKit: the keys then went
// nowhere.

export interface FocusedEntry {
	// `data-path` of the entry, and the section that holds it.
	path: string;
	section: string | undefined;
}

// The entry of `container` with the focus, if any.
export function focusedEntry(
	container: HTMLElement | undefined,
): FocusedEntry | undefined {
	const active = document.activeElement;
	if (!container || !(active instanceof HTMLElement)
		|| !container.contains(active)) {
		return undefined;
	}
	const path = active.closest<HTMLElement>('[data-path]')?.dataset.path;
	const section = active.closest('section')?.getAttribute('aria-label');
	return path === undefined
		? undefined
		: { path, section: section ?? undefined };
}

// Gives the focus back to `entry` when the page lost it, preferring the
// same section.
export function restoreFocus(
	container: HTMLElement | undefined,
	entry: FocusedEntry | undefined,
): void {
	const isLost = document.activeElement === document.body
		|| document.activeElement === null;
	if (!container || !entry || !isLost) {
		return;
	}
	const selector = `[data-path="${CSS.escape(entry.path)}"]`;
	const inSection = entry.section === undefined
		? null
		: container.querySelector<HTMLElement>(
				`section[aria-label="${CSS.escape(entry.section)}"] ${selector}`,
			);
	(inSection ?? container.querySelector<HTMLElement>(selector))
		?.focus({ preventScroll: true });
}
