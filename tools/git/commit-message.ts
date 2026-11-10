// SPDX-License-Identifier: GPL-3.0-or-later
// Rules for commit messages, see CONTRIBUTING.md#commit-messages.

const MAX_SUBJECT_LENGTH = 72;

const CONVENTIONAL_PREFIX = /^[a-z]+(\([^)]*\))?!?:\s/iu;
const TRAILING_PUNCTUATION = /[.!?,;:]$/u;
const AUTOSQUASH_PREFIX = /^(fixup|squash|amend)! /u;
const STARTS_WITH_CAPITAL = /^[A-Z]/u;

const NON_IMPERATIVE_VERBS = new Set([
	'Added',
	'Adding',
	'Adds',
	'Bumped',
	'Bumping',
	'Changed',
	'Changes',
	'Changing',
	'Created',
	'Creates',
	'Creating',
	'Deleted',
	'Deletes',
	'Deleting',
	'Fixed',
	'Fixes',
	'Fixing',
	'Implemented',
	'Implementing',
	'Implements',
	'Improved',
	'Improves',
	'Improving',
	'Merge',
	'Merged',
	'Moved',
	'Moves',
	'Moving',
	'Refactored',
	'Refactoring',
	'Refactors',
	'Removed',
	'Removes',
	'Removing',
	'Renamed',
	'Renames',
	'Renaming',
	'Replaced',
	'Replaces',
	'Replacing',
	'Updated',
	'Updates',
	'Updating',
]);

export interface CommitMessageOptions {
	readonly allowAutosquash: boolean;
}

interface SubjectRule {
	readonly isBroken: (subject: string) => boolean;
	readonly describe: (subject: string) => string;
}

function firstWordOf(subject: string): string {
	return subject.split(' ')[0] ?? '';
}

const SUBJECT_RULES: readonly SubjectRule[] = [
	{
		isBroken: (subject) => AUTOSQUASH_PREFIX.test(subject),
		describe: () => 'Squash fixup commits before merging',
	},
	{
		isBroken: (subject) => CONVENTIONAL_PREFIX.test(subject),
		describe: () => 'Do not use a type prefix: the branch name carries it',
	},
	{
		isBroken: (subject) => !STARTS_WITH_CAPITAL.test(subject),
		describe: () => 'Start the subject with a capital letter',
	},
	{
		isBroken: (subject) => TRAILING_PUNCTUATION.test(subject),
		describe: () => 'Do not end the subject with punctuation',
	},
	{
		isBroken: (subject) => subject.length > MAX_SUBJECT_LENGTH,
		describe: () =>
			`Keep the subject under ${String(MAX_SUBJECT_LENGTH)} characters`,
	},
	{
		isBroken: (subject) => NON_IMPERATIVE_VERBS.has(firstWordOf(subject)),
		describe: (subject) =>
			`Use the imperative mood instead of "${firstWordOf(subject)}"`,
	},
];

export function findCommitMessageErrors(
	message: string,
	options: CommitMessageOptions,
): string[] {
	const subject = message.split('\n')[0]?.trim() ?? '';

	if (subject.length === 0) {
		return ['The subject line is empty'];
	}
	if (options.allowAutosquash && AUTOSQUASH_PREFIX.test(subject)) {
		return [];
	}

	return SUBJECT_RULES.filter((rule) => rule.isBroken(subject)).map((rule) =>
		rule.describe(subject),
	);
}
