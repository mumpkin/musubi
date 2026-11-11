// SPDX-License-Identifier: GPL-3.0-or-later
// Search, as in Helix: `/` and `?` select the next or previous match of a
// regular expression, `n` and `N` the next and previous ones (in select
// mode they add a selection), `*` searches the selected text. Patterns
// without capitals ignore case (smart case).
import {
	EditorSelection,
	type EditorState,
	StateEffect,
	StateField,
} from '@codemirror/state';

import {
	type Command,
	type CommandTarget,
	currentMode,
	type PromptKind,
} from './context.ts';
import { selectMatches } from './editing.ts';

const setSearchPattern = StateEffect.define<string>();

// The last pattern searched, as the `/` register of Helix.
export const searchPatternField = StateField.define<string | undefined>({
	create: () => undefined,
	update(pattern, transaction) {
		for (const effect of transaction.effects) {
			if (effect.is(setSearchPattern)) {
				return effect.value;
			}
		}
		return pattern;
	},
});

interface Match {
	from: number;
	to: number;
}

function expression(pattern: string): RegExp | undefined {
	const flags = /\p{Lu}/u.test(pattern) ? 'gu' : 'giu';
	try {
		return new RegExp(pattern, flags);
	} catch {
		return undefined;
	}
}

function matchesOf(text: string, pattern: string): Match[] {
	const regex = expression(pattern);
	if (!regex) {
		return [];
	}
	return [...text.matchAll(regex)]
		.filter((found) => found[0].length > 0)
		.map((found) => ({
			from: found.index,
			to: found.index + found[0].length,
		}));
}

// The match after the main selection, or before it, wrapping around.
function nextMatch(
	state: EditorState,
	pattern: string,
	isForward: boolean,
): Match | undefined {
	const matches = matchesOf(state.doc.toString(), pattern);
	const { from, to } = state.selection.main;
	return isForward
		? matches.find((found) => found.from >= to) ?? matches[0]
		: matches.findLast((found) => found.to <= from) ?? matches.at(-1);
}

function selectMatch(
	target: CommandTarget,
	pattern: string,
	isForward: boolean,
): void {
	const { state } = target;
	const found = nextMatch(state, pattern, isForward);
	if (!found) {
		return;
	}
	const range = EditorSelection.range(found.from, found.to);
	const selection = currentMode(state) === 'select'
		? state.selection.addRange(range)
		: EditorSelection.create([range]);
	target.dispatch({ selection, scrollIntoView: true });
}

// What `/` (forward) and `?` (backward) run on the typed pattern.
export function searchFor(
	target: CommandTarget,
	pattern: string,
	isForward: boolean,
): void {
	if (pattern === '') {
		return;
	}
	target.dispatch({ effects: setSearchPattern.of(pattern) });
	selectMatch(target, pattern, isForward);
}

function searchAgain(isForward: boolean): Command {
	return ({ target }) => {
		const pattern = target.state.field(searchPatternField, false);
		if (pattern !== undefined) {
			selectMatch(target, pattern, isForward);
		}
	};
}

const isWordCharacter = (character: string): boolean =>
	/^[\p{L}\p{N}_]$/u.test(character);

function escapeRegExp(text: string): string {
	return text.replaceAll(/[.*+?^${}()|[\]\\/]/gu, '\\$&');
}

// `*`: the selected texts as a pattern, with `\b` where a selection starts
// or ends at a word boundary (`search_selection_detect_word_boundaries`).
const searchSelection: Command = ({ target }) => {
	const { state } = target;
	const char = (position: number): string =>
		state.sliceDoc(position, position + 1);
	const patterns = state.selection.ranges.map(({ from, to }) => {
		const startsWord = isWordCharacter(char(from))
			&& (from === 0 || !isWordCharacter(char(from - 1)));
		const endsWord = to > 0 && to < state.doc.length
			&& isWordCharacter(char(to - 1)) && !isWordCharacter(char(to));
		const text = escapeRegExp(state.sliceDoc(from, to));
		return `${startsWord ? '\\b' : ''}${text}${endsWord ? '\\b' : ''}`;
	});
	const pattern = [...new Set(patterns)].join('|');
	target.dispatch({ effects: setSearchPattern.of(pattern) });
};

export const searchCommands = {
	searchForward: ({ host }) => {
		host.openPrompt('search');
	},
	searchBackward: ({ host }) => {
		host.openPrompt('reverseSearch');
	},
	searchNext: searchAgain(true),
	searchPrevious: searchAgain(false),
	searchSelection,
} satisfies Record<string, Command>;

// Runs what was typed in the prompt of `s`, `/` or `?`; returns whether
// `kind` is one of them.
export function runPatternPrompt(
	target: CommandTarget,
	kind: PromptKind,
	line: string,
): boolean {
	if (kind === 'select') {
		selectMatches(target, line);
	} else if (kind === 'search' || kind === 'reverseSearch') {
		searchFor(target, line, kind === 'search');
	} else {
		return false;
	}
	return true;
}
