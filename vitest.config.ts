import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		projects: [
			{ test: { name: 'tools', include: ['tools/**/*.test.ts'] } },
			{
				test: {
					name: 'editor',
					include: ['packages/editor/src/**/*.test.ts'],
				},
			},
			{
				test: {
					name: 'desktop',
					include: ['apps/desktop/src/**/*.test.ts'],
				},
			},
		],
		coverage: {
			provider: 'v8',
			include: ['apps/*/src/**/*.ts', 'packages/*/src/**/*.ts', 'tools/**/*.ts'],
			exclude: ['**/*.test.ts', '**/bindings/**', 'tools/**/check-*.ts', 'apps/desktop/src/main.ts'],
		},
	},
});
