// SPDX-License-Identifier: GPL-3.0-or-later
// Undo steps, replayed in the real Helix: one insert session is one step,
// with what the command entering it changed (`c`), and each command of
// normal mode is a step of its own.
import type { HelixCase } from './helix-cases.ts';

const LINES = 'one two\nthree four\n\nfive.six seven\n';

export const UNDO_CASES: HelixCase[] = [
	{ text: LINES, keys: 'iab\x1biCD\x1bu' },
	{ text: LINES, keys: 'wcX\x1bu' },
	{ text: LINES, keys: 'oline\x1bu' },
	{ text: LINES, keys: 'iab\rcd\x1bu' },
	{ text: LINES, keys: 'xdxdu' },
];
