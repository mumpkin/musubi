// SPDX-License-Identifier: GPL-3.0-or-later
// The syntax tokens a theme colors. Typst highlights code blocks with a
// fixed palette, which `codemirror-lang-typst` shares: each of its colors
// stands for one token, so the theme can replace it with a CSS variable.

export const SYNTAX_TOKENS = [
	'comment',
	'keyword',
	'string',
	'constant',
	'function',
	'macro',
	'escape',
	'special',
	'raw',
] as const;

export type SyntaxToken = (typeof SYNTAX_TOKENS)[number];

// Colors of the default raw theme of Typst, lowercase.
const TYPST_COLORS = new Map<string, SyntaxToken>([
	['#74747c', 'comment'],
	['#d73948', 'keyword'],
	['#198810', 'string'],
	['#298e0d', 'string'],
	['#b60157', 'constant'],
	['#4b69c6', 'function'],
	['#16718d', 'macro'],
	['#1d6c76', 'escape'],
	['#8b41b1', 'special'],
	['#6b6b6f', 'raw'],
]);

// The token a color of the Typst palette stands for, if any.
export function typstToken(color: string): SyntaxToken | undefined {
	return TYPST_COLORS.get(color.trim().toLowerCase());
}

// The CSS color of a token in the current theme.
export function tokenColor(token: SyntaxToken): string {
	return `var(--syntax-${token})`;
}
