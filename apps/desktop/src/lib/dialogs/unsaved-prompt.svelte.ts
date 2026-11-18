// SPDX-License-Identifier: GPL-3.0-or-later
// The question asked before a note with unsaved changes leaves its pane:
// save, discard, or stay on it.
export type UnsavedChoice = 'save' | 'discard' | 'cancel';

interface PendingQuestion {
	// Title of the note with unsaved changes.
	title: string;
	resolve: (choice: UnsavedChoice) => void;
}

export class UnsavedPrompt {
	pending = $state<PendingQuestion>();

	// Resolves once the user answers. A new question cancels a pending one.
	async ask(title: string): Promise<UnsavedChoice> {
		this.pending?.resolve('cancel');
		return new Promise((resolve) => {
			this.pending = { title, resolve };
		});
	}

	readonly answer = (choice: UnsavedChoice): void => {
		const question = this.pending;
		this.pending = undefined;
		question?.resolve(choice);
	};
}
