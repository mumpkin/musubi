// SPDX-License-Identifier: GPL-3.0-or-later
// Shortcuts of the interface, in the Helix style: `Space` opens a menu, and
// `Space w` the pane commands as the window menu of Helix. Keys of a
// sequence are separated by spaces; `C-p` is Ctrl and p.

export type ShellAction
	= | 'palette'
		| 'findNote'
		| 'searchText'
		| 'newNote'
		| 'deleteNote'
		| 'deleteFolder'
		| 'showTrash'
		| 'openTutorial'
		| 'togglePin'
		| 'settings'
		| 'toggleExplorer'
		| 'toggleBacklinks'
		| 'toggleGraph'
		| 'toggleMode'
		| 'split'
		| 'closePane'
		| 'nextPane'
		| 'leftPanel'
		| 'rightPanel';

// Commands of the palette for each action.
interface ActionLabel {
	label: string;
	group: string;
}

export const ACTION_LABELS: Record<ShellAction, ActionLabel> = {
	palette: { label: 'Show the commands', group: 'View' },
	findNote: { label: 'Find a note by title', group: 'Note' },
	searchText: { label: 'Search the text of the notes', group: 'Note' },
	newNote: { label: 'New note', group: 'Note' },
	deleteNote: { label: 'Move the note to the trash', group: 'Note' },
	deleteFolder: {
		label: 'Move the folder of the note to the trash',
		group: 'Note',
	},
	showTrash: { label: 'Show the trash', group: 'Note' },
	openTutorial: { label: 'Open the tutorial', group: 'Help' },
	togglePin: { label: 'Pin or unpin the note', group: 'Note' },
	settings: { label: 'Open the settings', group: 'View' },
	toggleExplorer: { label: 'Toggle the note explorer', group: 'View' },
	toggleBacklinks: { label: 'Toggle backlinks', group: 'View' },
	toggleGraph: { label: 'Show the graph of links', group: 'View' },
	toggleMode: { label: 'Switch between reading and editing', group: 'Pane' },
	split: { label: 'Split the pane', group: 'Pane' },
	closePane: { label: 'Close the pane', group: 'Pane' },
	nextPane: { label: 'Next pane', group: 'Pane' },
	leftPanel: { label: 'Focus the panel on the left', group: 'View' },
	rightPanel: { label: 'Focus the panel on the right', group: 'View' },
};

const SEQUENCES = new Map<string, ShellAction>([
	['Space ?', 'palette'],
	['C-p', 'palette'],
	['Space f', 'findNote'],
	['Space /', 'searchText'],
	['Space n', 'newNote'],
	['Space ,', 'settings'],
	['Space e', 'toggleExplorer'],
	['Space b', 'toggleBacklinks'],
	['Space g', 'toggleGraph'],
	['Space r', 'toggleMode'],
	['Space h', 'leftPanel'],
	['Space l', 'rightPanel'],
	['Space w v', 'split'],
	['Space w q', 'closePane'],
	['Space w w', 'nextPane'],
	['Space w h', 'leftPanel'],
	['Space w l', 'rightPanel'],
]);

// The label of a shortcut, as shown in tooltips and the palette.
export function shortcutLabel(action: ShellAction): string {
	const sequence = [...SEQUENCES].find(([, value]) => value === action)?.[0];
	return (sequence ?? '').replaceAll('C-', 'Ctrl-');
}

export function keyName(event: KeyboardEvent): string {
	const key = event.key === ' ' ? 'Space' : event.key;
	return event.ctrlKey ? `C-${key}` : key;
}

export interface ShortcutResolution {
	action?: ShellAction;
	// Keys typed so far when a sequence is not complete.
	pending: string;
	// Whether the key belongs to a shortcut and must not reach the panes.
	isUsed: boolean;
}

// What `key` does after the keys `pending`. `Escape` cancels a sequence.
export function resolveShortcut(
	pending: string,
	key: string,
): ShortcutResolution {
	if (pending !== '' && key === 'Escape') {
		return { pending: '', isUsed: true };
	}
	const sequence = pending === '' ? key : `${pending} ${key}`;
	const action = SEQUENCES.get(sequence);
	if (action) {
		return { action, pending: '', isUsed: true };
	}
	const isPrefix = [...SEQUENCES.keys()].some((known) =>
		known.startsWith(`${sequence} `));
	return {
		pending: isPrefix ? sequence : '',
		isUsed: isPrefix || pending !== '',
	};
}
