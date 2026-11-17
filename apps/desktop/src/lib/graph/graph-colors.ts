// SPDX-License-Identifier: GPL-3.0-or-later
// The colors of the graph, read from the theme.

export interface GraphColors {
	link: string;
	node: string;
	current: string;
	hovered: string;
	label: string;
	background: string;
}

// The colors of CSS variables, resolved: the canvas cannot read
// `var(--accent)` nor `light-dark(…)`.
export function themeColors(element: Element): GraphColors {
	const probe = document.createElement('span');
	element.append(probe);
	const resolve = (variable: string): string => {
		probe.style.color = `var(${variable})`;
		return getComputedStyle(probe).color;
	};
	const colors = {
		link: resolve('--muted'),
		node: resolve('--muted'),
		current: resolve('--accent'),
		hovered: resolve('--foreground'),
		label: resolve('--foreground'),
		background: resolve('--background'),
	};
	probe.remove();
	return colors;
}
