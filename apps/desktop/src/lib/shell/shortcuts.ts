// SPDX-License-Identifier: GPL-3.0-or-later
// Shortcuts of the interface, in the Helix style: `Space` opens a menu and
// `Ctrl-w` the pane commands. Keys of a sequence are separated by spaces;
// `C-w` is Ctrl and w.

export type ShellAction
	= | 'palette'
		| 'toggleExplorer'
		| 'toggleBacklinks'
		| 'toggleMode'
		| 'split'
		| 'closePane'
		| 'nextPane'
		| 'leftPane'
		| 'rightPane';

// Commands of the palette for each action.
interface ActionLabel {
	label: string;
	group: string;
}

export const ACTION_LABELS: Record<ShellAction, ActionLabel> = {
	palette: { label: 'Show the commands', group: 'View' },
	toggleExplorer: { label: 'Toggle the note explorer', group: 'View' },
	toggleBacklinks: { label: 'Toggle backlinks', group: 'View' },
	toggleMode: { label: 'Switch between reading and editing', group: 'Pane' },
	split: { label: 'Split the pane', group: 'Pane' },
	closePane: { label: 'Close the pane', group: 'Pane' },
	nextPane: { label: 'Next pane', group: 'Pane' },
	leftPane: { label: 'Pane on the left', group: 'Pane' },
	rightPane: { label: 'Pane on the right', group: 'Pane' },
};

const SEQUENCES = new Map<string, ShellAction>([
	['Space ?', 'palette'],
	['C-p', 'palette'],
	['Space e', 'toggleExplorer'],
	['Space l', 'toggleBacklinks'],
	['Space r', 'toggleMode'],
	['C-w v', 'split'],
	['C-w q', 'closePane'],
	['C-w w', 'nextPane'],
	['C-w C-w', 'nextPane'],
	['C-w h', 'leftPane'],
	['C-w l', 'rightPane'],
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
