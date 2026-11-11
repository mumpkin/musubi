// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import { imageMarkup, pastedImageName } from './assets.ts';

describe('pastedImageName', () => {
	it('names pasted data from the local time', () => {
		const date = new Date(2026, 10, 10, 14, 3, 22);
		expect(pastedImageName('image/png', date))
			.toBe('image_20261110_140322.png');
		expect(pastedImageName('image/jpeg', date))
			.toBe('image_20261110_140322.jpg');
	});
});

describe('imageMarkup', () => {
	it('writes an image call', () => {
		expect(imageMarkup('Note.assets/a "b".png'))
			.toBe('#image("Note.assets/a \\"b\\".png")');
	});
});
