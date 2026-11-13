// SPDX-License-Identifier: GPL-3.0-or-later
// The two sides of a card, from the rendered HTML of its note: the review
// shows them as the reading view does, math included.
import { type NoteMarkup, toNoteMarkup } from '../reading/note-html.ts';

export interface CardSides {
	// What the review shows first, and after `Enter`.
	front: string;
	back: string;
	// Styles of the Typst export (math layout).
	styles: string;
}

// The sides of the card at `position` among the cards of the note, swapped
// for the reverse direction; `undefined` if the note no longer has it.
export function cardSides(
	html: string,
	position: number,
	isReverse: boolean,
): CardSides | undefined {
	const markup: NoteMarkup = toNoteMarkup(html);
	const body = new DOMParser().parseFromString(markup.body, 'text/html').body;
	const card = [...body.querySelectorAll('.musubi-card')][position];
	const question = card?.querySelector('.musubi-card-question')?.innerHTML;
	const answer = card?.querySelector('.musubi-card-answer')?.innerHTML;
	if (question === undefined || answer === undefined) {
		return undefined;
	}
	return isReverse
		? { front: answer, back: question, styles: markup.styles }
		: { front: question, back: answer, styles: markup.styles };
}
