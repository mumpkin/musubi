// SPDX-License-Identifier: GPL-3.0-or-later
// Undo steps as in Helix: each command is one step, whatever number of
// transactions it dispatches, and what is typed in insert mode joins the
// step of the command that entered it (`c` and the text typed after it
// undo together, `i` starts an empty one). CodeMirror groups changes by
// time instead.
import { history, isolateHistory } from '@codemirror/commands';
import {
	Annotation,
	EditorState,
	type Extension,
	StateField,
	Transaction,
	type TransactionSpec,
} from '@codemirror/state';

import type { CommandTarget } from './context.ts';
import { modeField } from './mode.ts';

// Number of the command that dispatched a transaction.
const commandStep = Annotation.define<number>();

let lastStep = 0;

// The step of the last transaction a command dispatched.
const stepField = StateField.define<number | undefined>({
	create: () => undefined,
	update: (step, transaction) => transaction.annotation(commandStep) ?? step,
});

// Longer than any insert session: only a new command starts a new step.
const SESSION_MILLISECONDS = 1e11;

const isInsert = (state: EditorState): boolean =>
	state.field(modeField, false) === 'insert';

const stepOf = (transaction: Transaction): number | undefined =>
	transaction.annotation(commandStep);

// Whether `transaction` is the first of a command; commands of insert
// mode (`Backspace`, `Tab`) stay in the session.
function startsStep(transaction: Transaction): boolean {
	const step = stepOf(transaction);
	return step !== undefined
		&& !isInsert(transaction.startState)
		&& step !== transaction.startState.field(stepField, false);
}

function withStep(
	spec: Transaction | TransactionSpec,
	step: number,
): Transaction | TransactionSpec {
	if (spec instanceof Transaction) {
		return spec;
	}
	const { annotations } = spec;
	const others = annotations === undefined ? [] : [annotations].flat();
	return { ...spec, annotations: [...others, commandStep.of(step)] };
}

// `target`, for one command: what it dispatches is one undo step.
export function commandTarget(target: CommandTarget): CommandTarget {
	lastStep += 1;
	const step = lastStep;
	const stepped: CommandTarget = {
		get state() {
			return target.state;
		},
		dispatch: (...specs) => {
			target.dispatch(...specs.map((spec) => withStep(spec, step)));
		},
	};
	if (target.scroller) {
		stepped.scroller = target.scroller;
	}
	return stepped;
}

export function helixHistory(): Extension {
	return [
		stepField,
		history({
			newGroupDelay: SESSION_MILLISECONDS,
			joinToEvent: (transaction) => isInsert(transaction.startState)
				|| (stepOf(transaction) !== undefined
					&& !startsStep(transaction)),
		}),
		EditorState.transactionExtender.of((transaction) => {
			if (stepOf(transaction) === undefined) {
				return null;
			}
			const annotations = [];
			if (startsStep(transaction)) {
				annotations.push(isolateHistory.of('before'));
			}
			// Moving the cursors records nothing: a selection in the history
			// would keep the typing that follows out of the step.
			if (!transaction.docChanged) {
				annotations.push(Transaction.addToHistory.of(false));
			}
			return { annotations };
		}),
	];
}
