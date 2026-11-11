// SPDX-License-Identifier: GPL-3.0-or-later
// Commands of the palette that choose, import and remove themes, until the
// settings screen (#36) offers the same.
import type { PaletteCommand } from '../shell/actions.ts';
import type { ThemeState } from './theme-state.svelte.ts';

const GROUP = 'Theme';

type Run = (task: () => Promise<unknown>) => void;

const marked = (label: string, isCurrent: boolean): string =>
	isCurrent ? `${label} (current)` : label;

function command(label: string, run: () => void): PaletteCommand {
	return { label, group: GROUP, run };
}

function chooseCommands(themes: ThemeState, run: Run): PaletteCommand[] {
	const system = marked('Follow the system theme', themes.chosen === null);
	return [
		command(system, () => {
			run(async () => themes.choose(null));
		}),
		...themes.choices.map(({ id, theme }) => command(
			marked(`Use the theme ${theme.name}`, themes.chosen === id),
			() => {
				run(async () => themes.choose(id));
			},
		)),
	];
}

function removeCommands(themes: ThemeState, run: Run): PaletteCommand[] {
	return themes.choices
		.filter((choice) => choice.isImported)
		.map(({ id, theme }) => command(`Remove the theme ${theme.name}`, () => {
			run(async () => themes.remove(id));
		}));
}

export function themeCommands(
	themes: ThemeState,
	report: (message: string) => void,
): PaletteCommand[] {
	const run: Run = (task) => {
		task().catch((error: unknown) => {
			report(String(error));
		});
	};
	const importing = command('Import a theme', () => {
		run(async () => {
			const name = await themes.importFile();
			if (name !== undefined) {
				report(`Imported the theme ${name}`);
			}
		});
	});
	return [
		...chooseCommands(themes, run),
		importing,
		...removeCommands(themes, run),
	];
}
