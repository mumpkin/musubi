// SPDX-License-Identifier: GPL-3.0-or-later
// Calls to the flashcard commands of the Rust core.
import { invoke } from '@tauri-apps/api/core';

import type { DueCard } from '../bindings/DueCard.ts';

// The cards to review in `scope`: `''` for the vault, a folder or a note.
export async function dueCards(scope: string): Promise<DueCard[]> {
	return invoke<DueCard[]>('due_cards', { scope });
}

// Ratings of a review, as FSRS names them.
export const RATINGS = [
	{ value: 1, label: 'Again' },
	{ value: 2, label: 'Hard' },
	{ value: 3, label: 'Good' },
	{ value: 4, label: 'Easy' },
] as const;

// Records the review of the card `key`.
export async function reviewCard(key: string, rating: number): Promise<void> {
	await invoke('review_card', { key, rating });
}
