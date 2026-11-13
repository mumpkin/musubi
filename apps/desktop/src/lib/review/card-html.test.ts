// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import { cardSides } from './card-html.ts';

const NOTE = `<html><head><style>math { color: red }</style></head><body>
<p>Intro</p>
<div class="musubi-card"><div class="musubi-card-question">chat</div>
<div class="musubi-card-answer">cat</div></div>
<div class="musubi-card" data-reverse=""><div class="musubi-card-question">
<strong>un</strong></div><div class="musubi-card-answer">one</div></div>
</body></html>`;

describe('cardSides', () => {
	it('finds a card by its position', () => {
		expect(cardSides(NOTE, 0, false)).toEqual({
			front: 'chat',
			back: 'cat',
			styles: 'math { color: red }',
		});
	});

	it('swaps the sides of the reverse direction', () => {
		const sides = cardSides(NOTE, 1, true);
		expect(sides?.front).toBe('one');
		expect(sides?.back.trim()).toBe('<strong>un</strong>');
	});

	it('gives nothing for a card that is gone', () => {
		expect(cardSides(NOTE, 2, false)).toBeUndefined();
	});
});
