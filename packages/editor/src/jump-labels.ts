// SPDX-License-Identifier: GPL-3.0-or-later
// `gw`: two-letter labels on the visible words; typing a label selects its
// word (or extends to it in select mode). Ported from `jump_to_word` and
// `jump_to_label` in Helix.
import {
	EditorSelection,
	type EditorState,
	type Range,
	StateEffect,
	StateField,
} from '@codemirror/state';
import { Decoration, EditorView, WidgetType } from '@codemirror/view';

import { type Command, type CommandTarget, currentMode } from './context.ts';
import { cursorOf } from './selection.ts';
import { nextWordEnd, previousWordStart, type Span } from './text.ts';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
// Labels have two letters, so only words of two characters or more get one.
const LABEL_LENGTH = 2;
const WORD_CHARACTER = /[\p{L}\p{N}_]/u;

interface JumpLabels {
	words: Span[];
	isExtending: boolean;
	primary: { from: number; to: number };
	// Index of the first letter typed, once typed.
	first?: number;
}

const setJumpLabels = StateEffect.define<JumpLabels | null>();

export const jumpLabelsField = StateField.define<JumpLabels | null>({
	create: () => null,
	update(labels, transaction) {
		for (const effect of transaction.effects) {
			if (effect.is(setJumpLabels)) {
				return effect.value;
			}
		}
		return transaction.docChanged ? null : labels;
	},
});

const isWord = (character: string | undefined): boolean =>
	character !== undefined && WORD_CHARACTER.test(character);

// Characters that are not word characters, from `position` onwards.
function nonWordAfter(text: string, position: number): number {
	let count = 0;
	while (position + count < text.length && !isWord(text[position + count])) {
		count += 1;
	}
	return count;
}

// Characters that are not word characters, just before `position`.
function nonWordBefore(text: string, position: number): number {
	let count = 0;
	while (position - count > 0 && !isWord(text[position - count - 1])) {
		count += 1;
	}
	return count;
}

function twoWordCharacters(text: string, from: number): boolean {
	return from >= 0 && isWord(text[from]) && isWord(text[from + 1]);
}

function cursorOfSpan(span: Span): number {
	return span.head > span.anchor ? span.head - 1 : span.head;
}

// Steps through the words after (`forward`) or before the cursor.
interface Scanner {
	span: Span;
	next: (span: Span) => Span;
	isLabelled: (span: Span) => boolean;
	trim: (span: Span) => Span;
	hasMore: (span: Span) => boolean;
}

function scanners(
	text: string,
	cursor: number,
	{ start, end }: { start: number; end: number },
): [Scanner, Scanner] {
	let forward: Span = { anchor: cursor, head: cursor };
	let backward: Span = { anchor: cursor, head: cursor };
	if (text[cursor] !== undefined && !/\s/u.test(text.charAt(cursor))) {
		const wordEnd = nextWordEnd(text, cursor);
		forward = wordEnd.anchor === cursor ? wordEnd : forward;
		const wordStart = previousWordStart(text, cursor);
		backward = wordStart.anchor === cursor + 1 ? wordStart : backward;
	}
	return [
		{
			span: forward,
			next: (span) => nextWordEnd(text, cursorOfSpan(span)),
			isLabelled: (span) =>
				twoWordCharacters(text, span.head - LABEL_LENGTH),
			trim: (span) => ({
				...span,
				anchor: span.anchor + nonWordAfter(text, span.anchor),
			}),
			hasMore: (span) => span.head < end,
		},
		{
			span: backward,
			next: (span) => previousWordStart(text, cursorOfSpan(span)),
			isLabelled: (span) => twoWordCharacters(text, span.head),
			trim: (span) => ({
				...span,
				anchor: span.anchor - nonWordBefore(text, span.anchor),
			}),
			hasMore: (span) => span.head > start,
		},
	];
}

// Advances `scanner` to its next labelled word, if any.
function nextWord(scanner: Scanner): Span | undefined {
	while (scanner.hasMore(scanner.span)) {
		const moved = scanner.next(scanner.span);
		if (moved.head === scanner.span.head) {
			return undefined;
		}
		scanner.span = moved;
		if (scanner.isLabelled(moved)) {
			return scanner.trim(moved);
		}
	}
	return undefined;
}

// Words to label, alternating after and before the cursor.
export function jumpWords(
	text: string,
	cursor: number,
	visible: { start: number; end: number },
): Span[] {
	const limit = ALPHABET.length * ALPHABET.length;
	const words: Span[] = [];
	const [forward, backward] = scanners(text, cursor, visible);
	let isChanged = true;
	while (isChanged && words.length < limit) {
		isChanged = false;
		for (const scanner of [forward, backward]) {
			const word = words.length < limit ? nextWord(scanner) : undefined;
			if (word) {
				words.push(word);
				isChanged = true;
			}
		}
	}
	return words;
}

export interface VisibleText {
	visibleRange?: () => { from: number; to: number };
}

function visibleLines(
	state: EditorState,
	target: CommandTarget & VisibleText,
): { start: number; end: number } {
	const visible = target.visibleRange?.()
		?? { from: 0, to: state.doc.length };
	const lastLine = state.doc.lineAt(visible.to);
	return {
		start: state.doc.lineAt(visible.from).from,
		end: Math.min(lastLine.to + 1, state.doc.length),
	};
}

export const showJumpLabels: Command = ({ target }) => {
	const { state } = target;
	const primary = state.selection.main;
	const words = jumpWords(
		state.doc.toString(),
		cursorOf(primary),
		visibleLines(state, target),
	);
	const isExtending = currentMode(state) === 'select';
	target.dispatch({
		effects: setJumpLabels.of({
			words,
			isExtending,
			primary: { from: primary.from, to: primary.to },
		}),
	});
};

function jumpTo(labels: JumpLabels, word: Span): EditorSelection {
	const from = Math.min(word.anchor, word.head);
	const to = Math.max(word.anchor, word.head);
	if (!labels.isExtending) {
		return EditorSelection.single(from, to);
	}
	const anchor = word.anchor < word.head
		? Math.min(word.anchor, labels.primary.from)
		: Math.max(word.anchor, labels.primary.to);
	return EditorSelection.single(anchor, word.head);
}

// Handles a key while labels are shown; returns whether it was used.
export function pressJumpLabel(target: CommandTarget, key: string): boolean {
	const labels = target.state.field(jumpLabelsField, false);
	if (!labels) {
		return false;
	}
	const letter = ALPHABET.indexOf(key);
	const isLetter = key.length === 1 && letter >= 0;
	if (labels.first === undefined && isLetter
		&& letter * ALPHABET.length <= labels.words.length) {
		target.dispatch({
			effects: setJumpLabels.of({ ...labels, first: letter }),
		});
		return true;
	}
	const word = isLetter && labels.first !== undefined
		? labels.words[labels.first * ALPHABET.length + letter]
		: undefined;
	target.dispatch({
		effects: setJumpLabels.of(null),
		...(word ? { selection: jumpTo(labels, word) } : {}),
	});
	return true;
}

class LabelLetter extends WidgetType {
	private readonly letter: string;

	constructor(letter: string) {
		super();
		this.letter = letter;
	}

	override eq(other: LabelLetter): boolean {
		return other.letter === this.letter;
	}

	// Name imposed by CodeMirror.
	// eslint-disable-next-line @typescript-eslint/naming-convention
	override toDOM(): HTMLElement {
		const element = document.createElement('span');
		element.className = 'helix-jump-label';
		element.textContent = this.letter;
		return element;
	}
}

// Labels replace the first two letters of their word, as in Helix.
export const jumpLabelDecorations = EditorView.decorations.compute(
	[jumpLabelsField],
	(state) => {
		const labels = state.field(jumpLabelsField);
		if (!labels) {
			return Decoration.none;
		}
		const marks: Range<Decoration>[] = [];
		labels.words.forEach((word, index) => {
			const outer = Math.floor(index / ALPHABET.length);
			if (labels.first !== undefined && outer !== labels.first) {
				return;
			}
			const from = Math.min(word.anchor, word.head);
			const letters = [
				ALPHABET.charAt(outer),
				ALPHABET.charAt(index % ALPHABET.length),
			];
			letters.forEach((letter, offset) => {
				const widget = new LabelLetter(letter);
				marks.push(Decoration.replace({ widget })
					.range(from + offset, from + offset + 1));
			});
		});
		return Decoration.set(marks, true);
	},
);
