// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import { nearNote } from './missing-links.ts';

describe('nearNote', () => {
	const paths = [
		'Japonais/Les Kanjis dans la tête/Chapitre_01.typ',
		'Maths/Analyse.typ',
	];

	it('finds the note a link misses by spaces, case or accents', () => {
		expect(nearNote('Japonais/Les_Kanjis_dans_la_tete/chapitre 01.typ', paths))
			.toBe('Japonais/Les Kanjis dans la tête/Chapitre_01.typ');
	});

	it('finds nothing for a different name', () => {
		expect(nearNote('Maths/Algèbre.typ', paths)).toBeUndefined();
	});
});
