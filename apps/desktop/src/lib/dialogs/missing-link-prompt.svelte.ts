// SPDX-License-Identifier: GPL-3.0-or-later
// The question asked before following a link to a note that does not
// exist, when a note exists under a near name or the link would create
// folders: open the near note, point the links at it, create the note,
// or cancel.
export type MissingLinkChoice = 'open' | 'fix' | 'create' | 'cancel';

export interface MissingLink {
	// The missing note, with its extension.
	path: string;
	// A note with a near name, if any.
	near: string | undefined;
	// The folder creating the note would create, if any.
	newFolder: string | undefined;
}

interface PendingQuestion extends MissingLink {
	resolve: (choice: MissingLinkChoice) => void;
}

export class MissingLinkPrompt {
	pending = $state<PendingQuestion>();

	// Resolves once the user answers. A new question cancels a pending one.
	async ask(link: MissingLink): Promise<MissingLinkChoice> {
		this.pending?.resolve('cancel');
		return new Promise((resolve) => {
			this.pending = { ...link, resolve };
		});
	}

	readonly answer = (choice: MissingLinkChoice): void => {
		const question = this.pending;
		this.pending = undefined;
		question?.resolve(choice);
	};
}
