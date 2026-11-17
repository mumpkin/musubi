// SPDX-License-Identifier: GPL-3.0-or-later
// Which titles the graph writes: as many as fit without covering one
// another, the most useful first. Placed in screen pixels, so that a title
// keeps its size at every zoom.

export interface LabelBox {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

// Side of the cells of the grid that finds the titles near a box, in
// screen pixels.
const CELL = 64;
const HALF = 2;

// The screen space taken by the titles written so far.
export class LabelSpace {
	private readonly cells = new Map<string, LabelBox[]>();

	private* cellsOf(box: LabelBox): Generator<string> {
		const firstColumn = Math.floor(box.left / CELL);
		const lastColumn = Math.floor(box.right / CELL);
		const firstRow = Math.floor(box.top / CELL);
		const lastRow = Math.floor(box.bottom / CELL);
		for (let column = firstColumn; column <= lastColumn; column += 1) {
			for (let row = firstRow; row <= lastRow; row += 1) {
				yield `${String(column)},${String(row)}`;
			}
		}
	}

	private isFree(box: LabelBox): boolean {
		for (const cell of this.cellsOf(box)) {
			const taken = this.cells.get(cell) ?? [];
			if (taken.some((other) => overlaps(box, other))) {
				return false;
			}
		}
		return true;
	}

	// Takes `box` if nothing written covers it; returns whether it did.
	take(box: LabelBox): boolean {
		if (!this.isFree(box)) {
			return false;
		}
		for (const cell of this.cellsOf(box)) {
			const taken = this.cells.get(cell);
			if (taken) {
				taken.push(box);
			} else {
				this.cells.set(cell, [box]);
			}
		}
		return true;
	}
}

function overlaps(one: LabelBox, other: LabelBox): boolean {
	return one.left < other.right
		&& other.left < one.right
		&& one.top < other.bottom
		&& other.top < one.bottom;
}

// The box of a title of `width` centred at `across`, its top at `top`,
// with `margin` around it.
export function boxAt(
	across: number,
	top: number,
	size: { width: number; height: number; margin: number },
): LabelBox {
	const half = size.width / HALF;
	return {
		left: across - half - size.margin,
		top: top - size.margin,
		right: across + half + size.margin,
		bottom: top + size.height + size.margin,
	};
}

// Widths of titles in `font`, measured once.
const MAX_MEASURES = 20_000;
// Rough width of a character when the canvas cannot measure.
const CHARACTER_WIDTH = 7;

export class TextWidths {
	private readonly widths = new Map<string, number>();
	private readonly context: CanvasRenderingContext2D | null;

	constructor(font: string) {
		this.context = document.createElement('canvas').getContext('2d');
		if (this.context) {
			this.context.font = font;
		}
	}

	of(text: string): number {
		let width = this.widths.get(text);
		if (width === undefined) {
			if (this.widths.size > MAX_MEASURES) {
				this.widths.clear();
			}
			width = this.context?.measureText(text).width
				?? text.length * CHARACTER_WIDTH;
			this.widths.set(text, width);
		}
		return width;
	}
}
