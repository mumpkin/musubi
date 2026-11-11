// SPDX-License-Identifier: GPL-3.0-or-later
// Every scroll of the editor is animated: the eyes follow the text instead
// of losing their place. Moves that reveal the cursor keep a margin of
// lines around it, as `scrolloff` in Helix.
import type { SelectionRange } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { SCROLL_OFF_LINES } from './navigation.ts';

type Alignment = 'nearest' | 'start' | 'end' | 'center';

const HALF = 2;

interface Placement {
	top: number;
	height: number;
	margin: number;
}

// The scroll position that shows the line at `top` (in the scroller), or
// `undefined` if it is already in view.
function scrollTop(
	scroller: HTMLElement,
	{ top, height, margin }: Placement,
	alignment: Alignment,
): number | undefined {
	const view = scroller.clientHeight;
	switch (alignment) {
		case 'center': {
			return top - (view - height) / HALF;
		}
		case 'start': {
			return top - margin;
		}
		case 'end': {
			return top + height + margin - view;
		}
		case 'nearest': {
			if (top - margin < scroller.scrollTop) {
				return top - margin;
			}
			const bottom = top + height + margin;
			const isBelow = bottom > scroller.scrollTop + view;
			return isBelow ? bottom - view : undefined;
		}
	}
}

function scrollSmoothly(
	view: EditorView,
	range: SelectionRange,
	alignment: Alignment,
): boolean {
	const scroller = view.scrollDOM;
	const block = view.lineBlockAt(range.head);
	const documentTop = view.documentTop - scroller.getBoundingClientRect().top
		+ scroller.scrollTop;
	const margin = Math.min(
		SCROLL_OFF_LINES * view.defaultLineHeight,
		(scroller.clientHeight - block.height) / HALF,
	);
	const top = scrollTop(
		scroller,
		{ top: documentTop + block.top, height: block.height, margin },
		alignment,
	);
	if (top !== undefined) {
		scroller.scrollTo({ top, behavior: 'smooth' });
	}
	return true;
}

export const smoothScrolling = EditorView.scrollHandler.of(
	(view, range, options) => scrollSmoothly(view, range, options.y),
);
