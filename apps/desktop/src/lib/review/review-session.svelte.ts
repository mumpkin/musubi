// SPDX-License-Identifier: GPL-3.0-or-later
// A review of the flashcards of a scope: the cards due, the one shown, its
// answer once revealed, and each rating written to the log of the device.
// After each rating the due cards are read again: a card rated _Again_
// comes back once due.
import type { DueCard } from '../bindings/DueCard.ts';
import { renderNote } from '../reading/render-note.ts';
import { dueCards, reviewCard } from '../vault/reviews.ts';
import { type CardSides, cardSides } from './card-html.ts';
import { reviewRevision } from './due-counts.svelte.ts';

export class ReviewSession {
	cards = $state.raw<DueCard[]>([]);
	sides = $state.raw<CardSides>();
	isRevealed = $state(false);
	isLoading = $state(true);
	failure = $state<string>();
	// Cards rated in this session.
	reviewed = $state(0);

	readonly current = $derived(this.cards[0]);

	private readonly scope: string;
	// Rendered HTML of each note, for the session.
	private readonly notes: Record<string, string> = {};

	constructor(scope: string) {
		this.scope = scope;
	}

	async load(): Promise<void> {
		this.isLoading = true;
		try {
			this.cards = await dueCards(this.scope);
			await this.showCurrent();
			this.failure = undefined;
		} catch (error) {
			this.failure = String(error);
		} finally {
			this.isLoading = false;
		}
	}

	reveal(): void {
		if (this.current) {
			this.isRevealed = true;
		}
	}

	// Rates the card shown, once its answer is revealed.
	async rate(rating: number): Promise<void> {
		const card = this.current;
		if (!card || !this.isRevealed) {
			return;
		}
		await reviewCard(card.key, rating);
		this.reviewed += 1;
		reviewRevision.count += 1;
		await this.load();
	}

	private async showCurrent(): Promise<void> {
		this.isRevealed = false;
		const card = this.current;
		if (!card) {
			this.sides = undefined;
			return;
		}
		const html = this.notes[card.note]
			?? (await renderNote(card.note)).note.html
			?? '';
		this.notes[card.note] = html;
		// A note that does not compile: its plain text still shows.
		this.sides = cardSides(html, card.position, card.isReverse)
			?? plainSides(card);
	}
}

function escape(text: string): string {
	const element = document.createElement('span');
	element.textContent = text;
	return element.innerHTML;
}

function plainSides(card: DueCard): CardSides {
	const question = escape(card.question);
	const answer = escape(card.answer);
	return card.isReverse
		? { front: answer, back: question, styles: '' }
		: { front: question, back: answer, styles: '' };
}
