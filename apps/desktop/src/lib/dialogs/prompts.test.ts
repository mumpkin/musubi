// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import { MissingLinkPrompt } from './missing-link-prompt.svelte.ts';
import { UnsavedPrompt } from './unsaved-prompt.svelte.ts';

describe('UnsavedPrompt', () => {
	it('resolves with the answer, and cancels a question asked over', async () => {
		const prompt = new UnsavedPrompt();
		const first = prompt.ask('A');
		const second = prompt.ask('B');
		expect(prompt.pending?.title).toBe('B');
		prompt.answer('save');
		await expect(first).resolves.toBe('cancel');
		await expect(second).resolves.toBe('save');
		expect(prompt.pending).toBeUndefined();
	});
});

describe('MissingLinkPrompt', () => {
	it('keeps the link asked about until the answer', async () => {
		const prompt = new MissingLinkPrompt();
		const answer = prompt.ask({
			path: 'A_b.typ',
			near: 'A b.typ',
			newFolder: undefined,
		});
		expect(prompt.pending?.near).toBe('A b.typ');
		prompt.answer('fix');
		await expect(answer).resolves.toBe('fix');
	});
});
