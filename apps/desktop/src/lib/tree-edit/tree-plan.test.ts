// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';

import { buildTree } from '../vault/tree.ts';
import { applyPlan, type TreeCommands } from './tree-apply.ts';
import { planChanges } from './tree-plan.ts';
import { treeText } from './tree-text.ts';

const TREE = treeText(buildTree({
	folders: ['Maths', 'Maths/Algebra', 'Physics'],
	notes: [
		{ path: 'Home.typ', title: 'Home' },
		{ path: 'Maths/Analysis.typ', title: 'Analysis' },
		{ path: 'Maths/Algebra/Groups.typ', title: 'Groups' },
		{ path: 'Physics/Waves.typ', title: 'Waves' },
	],
	pinned: [],
}));

// The text of the tree with `edit` applied to its lines (ids hidden).
function edited(edit: (lines: string[]) => string[]): string {
	return edit(TREE.text.split('\n')).join('\n');
}

const replace = (from: string, to: string) => (lines: string[]) =>
	lines.map((line) => line.replace(from, to));

describe('treeText', () => {
	it('indents folders then notes, with hidden ids', () => {
		expect(TREE.text).toBe([
			'/1 Maths/',
			'  /2 Algebra/',
			'    /3 Groups',
			'  /4 Analysis',
			'/5 Physics/',
			'  /6 Waves',
			'/7 Home',
		].join('\n'));
	});
});

describe('planChanges', () => {
	it('finds nothing to do in an unchanged tree', () => {
		expect(planChanges(TREE.text, TREE.entries)).toEqual({
			operations: [],
			errors: [],
		});
	});

	it('retitles notes and renames folders', () => {
		const text = edited((lines) =>
			replace('Analysis', 'Real analysis')(
				replace('Physics/', 'Science/')(lines),
			));
		expect(planChanges(text, TREE.entries).operations).toEqual([
			{ kind: 'retitle', id: 4, title: 'Real analysis' },
			{
				kind: 'move',
				id: 5,
				parent: 'root',
				name: 'Science',
				target: 'Science/',
			},
		]);
	});

	it('moves a line pasted under another folder', () => {
		const text = edited((lines) => {
			const [waves] = lines.splice(5, 1);
			lines.splice(1, 0, `  ${waves?.trim() ?? ''}`);
			return lines;
		});
		expect(planChanges(text, TREE.entries).operations).toEqual([{
			kind: 'move',
			id: 6,
			parent: { entry: 1 },
			name: 'Waves',
			target: 'Maths/Waves',
		}]);
	});

	it('creates new lines and trashes removed ones', () => {
		const text = edited((lines) => [
			...lines.filter((line) => !line.includes('Algebra')
				&& !line.includes('Groups')),
			'Ideas/',
			'  First idea',
			'Drafts/Today',
		]);
		const { operations } = planChanges(text, TREE.entries);
		expect(operations.map((operation) => operation.kind)).toEqual([
			'create',
			'create',
			'create',
			'trash',
		]);
		expect(operations[1]).toMatchObject({
			name: 'First idea',
			parent: { line: 5 },
			target: 'Ideas/First idea',
		});
		expect(operations[3]).toEqual({ kind: 'trash', id: 2 });
	});

	it('reports invalid lines and plans nothing', () => {
		const text = edited((lines) => [
			...lines,
			'/7 Home again',
			'Physics/',
			'/99 Ghost',
			'  under a note',
		]);
		const { operations, errors } = planChanges(text, TREE.entries);
		expect(operations).toEqual([]);
		const lines = errors.map((error) => error.line);
		lines.sort((left, right) => left - right);
		expect(lines).toEqual([8, 9, 10, 11]);
	});
});

describe('applyPlan', () => {
	it('follows the paths of entries inside moved folders', async () => {
		const calls: string[] = [];
		const commands: TreeCommands = {
			createNote: async (folder, title) => {
				calls.push(`note ${folder} ${title}`);
				return Promise.resolve(`${folder}/${title}.typ`);
			},
			createFolder: async (parent, name) => {
				calls.push(`folder ${parent} ${name}`);
				return Promise.resolve(parent === '' ? name : `${parent}/${name}`);
			},
			retitle: async (path, title) => {
				calls.push(`retitle ${path} ${title}`);
				return Promise.resolve(path.replace(/[^/]+\.typ$/u, `${title}.typ`));
			},
			move: async (path, to) => {
				calls.push(`move ${path} ${to}`);
				const name = path.endsWith('.typ') ? path.split('/').at(-1) : '';
				return Promise.resolve(name
					? to.replace(/[^/]+$/u, name)
					: to);
			},
			trash: async (path) => {
				calls.push(`trash ${path}`);
				return Promise.resolve();
			},
		};
		// Physics moves into Maths, renamed; Waves gets a new title.
		const text = edited((lines) => {
			lines.splice(4, 2, '  /5 Science/', '    /6 Sound');
			return lines;
		});
		const plan = planChanges(text, TREE.entries);
		const { operations } = plan;
		const applied = await applyPlan(operations, TREE.entries, commands);
		expect(calls).toEqual([
			'retitle Physics/Waves.typ Sound',
			'move Physics Maths/Science',
		]);
		expect(applied.moved).toEqual([
			{ from: 'Physics/Waves.typ', to: 'Maths/Science/Sound.typ' },
		]);
	});
});
