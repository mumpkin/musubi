// SPDX-License-Identifier: GPL-3.0-or-later
// How many flashcards are due, in the vault and in each note: shown next to
// the vault name and in the header of a note. Read again when the vault may
// have changed and after each review.
import { dueCards } from '../vault/reviews.ts';

// Bumped by each rating, so that the counts follow the reviews.
export const reviewRevision = $state({ count: 0 });

export class DueCounts {
	vault = $state(0);
	private byNote = $state.raw<Readonly<Record<string, number>>>({});

	// `revision` changes when the vault may have changed. Built while a
	// component starts, for its effect.
	constructor(revision: () => number) {
		$effect(() => {
			revision();
			// Read to count again after a review.
			// eslint-disable-next-line @typescript-eslint/no-unused-expressions
			reviewRevision.count;
			this.refresh().catch(() => undefined);
		});
	}

	of(note: string): number {
		return this.byNote[note] ?? 0;
	}

	private async refresh(): Promise<void> {
		const cards = await dueCards('');
		const counts: Record<string, number> = {};
		for (const card of cards) {
			counts[card.note] = (counts[card.note] ?? 0) + 1;
		}
		this.vault = cards.length;
		this.byNote = counts;
	}
}
