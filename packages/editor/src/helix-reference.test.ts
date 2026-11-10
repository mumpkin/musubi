// SPDX-License-Identifier: GPL-3.0-or-later
// Compares the editor with the real Helix, recorded by
// `tools/helix/record-helix-reference.ts`.
import { describe, expect, it } from 'vitest';

import reference from './helix-reference.json' with { type: 'json' };
import { markSelections, replayKeys } from './helix-replay.ts';
import { TestEditor } from './test-editor.ts';

describe('behaves like Helix', () => {
	for (const helixCase of reference) {
		it(`on ${JSON.stringify(helixCase.keys)}`, async () => {
			const editor = new TestEditor(helixCase.initialText);
			replayKeys(editor, helixCase.keys);
			// Pasting reads the clipboard asynchronously.
			if (helixCase.keys.includes('p')) {
				await new Promise((resolve) => setTimeout(resolve));
			}
			expect({ text: editor.text, ...markSelections(editor) }).toEqual({
				text: helixCase.text,
				starts: helixCase.starts,
				ends: helixCase.ends,
				cursors: helixCase.cursors,
			});
		});
	}
});
