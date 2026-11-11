// SPDX-License-Identifier: GPL-3.0-or-later
// Typst support for the editor, as `typst_lezer` of `codemirror-lang-typst`
// builds it, with the syntax colors of the theme instead of the fixed
// colors of the package.
import {
	HighlightStyle,
	Language,
	languageDataProp,
	LanguageSupport,
	syntaxHighlighting,
} from '@codemirror/language';
import { type Tag, tags } from '@lezer/highlight';
import {
	typstLezerFolding,
	typstLezerFoldService,
	typstLezerHighlighting,
	typstLezerIndentation,
	typstLezerIndentService,
	typstLezerLanguageData,
	typstLezerLinter,
	typstLezerListKeymap,
	TypstLezerParser,
	typstTags,
} from 'codemirror-lang-typst/lezer';

import { type SyntaxToken, tokenColor } from './syntax-colors.ts';

// The tags the package colors, with the token of the same color.
const COLORED_TAGS: [SyntaxToken, Tag][] = [
	['comment', tags.comment],
	['raw', tags.monospace],
	['string', typstTags.mathDelimiter],
	['special', typstTags.listMarker],
	['escape', tags.escape],
	['escape', tags.labelName],
	['keyword', tags.keyword],
	['keyword', tags.null],
	['keyword', tags.atom],
	['keyword', tags.bool],
	['constant', tags.number],
	['string', tags.string],
	['function', tags.function(tags.variableName)],
	['special', typstTags.interpolated],
	['special', tags.propertyName],
];

const themedStyle = HighlightStyle.define([
	...COLORED_TAGS.map(([token, tag]) => ({ tag, color: tokenColor(token) })),
	{ tag: tags.heading, fontWeight: 'bold', textDecoration: 'underline' },
	{ tag: tags.strong, fontWeight: 'bold' },
	{ tag: tags.emphasis, fontStyle: 'italic' },
	{ tag: tags.link, textDecoration: 'underline' },
]);

export function typstLanguage(): LanguageSupport {
	const parser = new TypstLezerParser(
		languageDataProp.add((type) =>
			type.isTop ? typstLezerLanguageData : undefined),
		typstLezerHighlighting,
		typstLezerIndentation,
		typstLezerFolding,
	);
	return new LanguageSupport(
		new Language(typstLezerLanguageData, parser, [], 'typst'),
		[
			syntaxHighlighting(themedStyle),
			typstLezerIndentService,
			typstLezerListKeymap,
			typstLezerFoldService,
			typstLezerLinter,
		],
	);
}
