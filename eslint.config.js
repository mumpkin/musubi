// SPDX-License-Identifier: GPL-3.0-or-later
// Lint and formatting rules. They mirror the Clean Code rules of the
// project (see CONTRIBUTING.md); the Rust equivalents live in clippy.toml.
import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import { defineConfig } from 'eslint/config';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import sonarjs from 'eslint-plugin-sonarjs';
import svelte from 'eslint-plugin-svelte';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import svelteConfig from './apps/desktop/svelte.config.js';

const MAX_COMPLEXITY = 10;
const MAX_LINES_PER_FUNCTION = 40;
const MAX_LINES_PER_FILE = 300;
const MAX_PARAMS = 3;
const MAX_LINE_LENGTH = 80;
const TAB_WIDTH = 4;
const MIN_IDENTIFIER_LENGTH = 2;

const cleanCodeRules = {
	'complexity': ['error', MAX_COMPLEXITY],
	'sonarjs/cognitive-complexity': ['error', MAX_COMPLEXITY],
	'max-lines-per-function': [
		'error',
		{ max: MAX_LINES_PER_FUNCTION, skipBlankLines: true },
	],
	'max-lines': ['error', { max: MAX_LINES_PER_FILE, skipBlankLines: true }],
	'max-params': 'off',
	'@typescript-eslint/max-params': ['error', { max: MAX_PARAMS }],
	'no-magic-numbers': 'off',
	'@typescript-eslint/no-magic-numbers': [
		'error',
		{
			ignore: [-1, 0, 1],
			ignoreArrayIndexes: true,
			ignoreDefaultValues: true,
			ignoreEnums: true,
			ignoreNumericLiteralTypes: true,
			ignoreReadonlyClassProperties: true,
			ignoreTypeIndexes: true,
			enforceConst: true,
		},
	],
	'no-nested-ternary': 'error',
	'no-param-reassign': 'error',
	'curly': ['error', 'all'],
	'no-shadow': 'off',
	'@typescript-eslint/no-shadow': 'error',
	'id-length': ['error', { min: MIN_IDENTIFIER_LENGTH }],
	'id-match': ['error', '^[A-Za-z0-9_$]*$'],
	'@typescript-eslint/naming-convention': [
		'error',
		{ selector: 'default', format: ['strictCamelCase'] },
		{
			selector: 'variable',
			modifiers: ['const'],
			format: ['strictCamelCase', 'UPPER_CASE'],
		},
		{ selector: 'import', format: ['strictCamelCase', 'StrictPascalCase'] },
		{ selector: 'typeLike', format: ['StrictPascalCase'] },
		{
			selector: ['objectLiteralProperty', 'typeProperty'],
			modifiers: ['requiresQuotes'],
			format: null,
		},
	],
	'@typescript-eslint/no-unused-vars': ['error', { args: 'all' }],
	'unused-imports/no-unused-imports': 'error',
	'simple-import-sort/imports': 'error',
	'simple-import-sort/exports': 'error',
	'@stylistic/max-len': [
		'error',
		{
			code: MAX_LINE_LENGTH,
			tabWidth: TAB_WIDTH,
			ignoreUrls: true,
			ignoreStrings: true,
			ignoreTemplateLiterals: true,
			ignoreRegExpLiterals: true,
		},
	],
};

const svelteLayoutRules = {
	'@stylistic/indent': 'off',
	'svelte/indent': ['error', { indent: 'tab' }],
	'svelte/html-quotes': ['error', { prefer: 'double' }],
	'svelte/first-attribute-linebreak': 'error',
	'svelte/max-attributes-per-line': 'error',
	'svelte/html-closing-bracket-new-line': 'error',
	'svelte/html-closing-bracket-spacing': 'error',
	'svelte/html-self-closing': 'error',
	'svelte/mustache-spacing': 'error',
	'svelte/no-spaces-around-equal-signs-in-attribute': 'error',
	'svelte/shorthand-attribute': 'error',
	'svelte/shorthand-directive': 'error',
	'svelte/spaced-html-comment': 'error',
};

export default defineConfig(
	{
		ignores: [
			'**/dist/**',
			'**/coverage/**',
			'**/target/**',
			'**/src-tauri/gen/**',
			'**/bindings/**',
		],
	},
	js.configs.recommended,
	tseslint.configs.strictTypeChecked,
	tseslint.configs.stylisticTypeChecked,
	svelte.configs.recommended,
	stylistic.configs.customize({
		indent: 'tab',
		quotes: 'single',
		semi: true,
		commaDangle: 'always-multiline',
		braceStyle: '1tbs',
		arrowParens: true,
	}),
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node },
			parserOptions: {
				projectService: {
					allowDefaultProject: ['*.js', '*.ts'],
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.svelte'],
			},
		},
		plugins: {
			'sonarjs': sonarjs,
			'simple-import-sort': simpleImportSort,
			'unused-imports': unusedImports,
		},
		rules: cleanCodeRules,
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts'],
		languageOptions: {
			parserOptions: { parser: tseslint.parser, svelteConfig },
		},
		rules: svelteLayoutRules,
	},
	{
		files: ['**/*.test.ts'],
		rules: {
			'max-lines-per-function': 'off',
			'@typescript-eslint/no-magic-numbers': 'off',
		},
	},
);
