// SPDX-License-Identifier: GPL-3.0-or-later
// Keys added after the first profile, replayed in the real Helix: insert
// at the line start or end, replace, switch case, join, select all, keep
// the primary selection, find a character, long words, and the deletions
// of insert mode. `\x17` is Ctrl-w and `\x15` is Ctrl-u.
import type { HelixCase } from './helix-cases.ts';

const LINES = 'one two\nthree four\n\nfive.six seven\n';
const INDENTED = 'start\n    indented line\n\t\ttabs\n';
const WORDS = 'alpha beta_gamma  delta-epsilon, zeta\n';

export const KEY_CASES: HelixCase[] = [
	{ text: LINES, keys: 'Ax\x1b' },
	{ text: LINES, keys: 'wAx\x1b' },
	{ text: INDENTED, keys: 'jIx\x1b' },
	{ text: INDENTED, keys: 'jwIx\x1b' },
	{ text: LINES, keys: 'rX' },
	{ text: LINES, keys: 'wrX' },
	{ text: LINES, keys: 'xrX' },
	{ text: LINES, keys: '~' },
	{ text: LINES, keys: 'w~' },
	{ text: LINES, keys: 'x~' },
	{ text: LINES, keys: 'J' },
	{ text: LINES, keys: 'xxJ' },
	{ text: LINES, keys: 'jJ' },
	{ text: INDENTED, keys: 'J' },
	{ text: LINES, keys: '%' },
	{ text: LINES, keys: '%d' },
	{ text: LINES, keys: 'C,' },
	{ text: LINES, keys: 'fe' },
	{ text: LINES, keys: 'fw' },
	{ text: LINES, keys: 'fh' },
	{ text: LINES, keys: 'te' },
	{ text: LINES, keys: 'wFo' },
	{ text: LINES, keys: 'wTo' },
	{ text: WORDS, keys: 'W' },
	{ text: WORDS, keys: 'WW' },
	{ text: WORDS, keys: 'E' },
	{ text: WORDS, keys: 'EE' },
	{ text: WORDS, keys: 'WWB' },
	{ text: WORDS, keys: 'eeeeB' },
	{ text: LINES, keys: 'A foo\x17\x1b' },
	{ text: LINES, keys: 'A x y\x15\x1b' },
];
