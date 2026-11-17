import { svelte } from '@sveltejs/vite-plugin-svelte';
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
				// Compiles the runes of `.svelte.ts` modules.
				plugins: [svelte()],
				resolve: { conditions: ['browser'] },
				test: {
					name: 'desktop',
					include: ['apps/desktop/src/**/*.test.ts'],
					environment: 'happy-dom',
				},
			},
		],
		coverage: {
			provider: 'v8',
			include: ['apps/*/src/**/*.ts', 'packages/*/src/**/*.ts', 'tools/**/*.ts'],
			// Scripts run by hand (`tools/helix/` drives the real Helix).
			exclude: [
				'**/*.test.ts',
				'**/bindings/**',
				'tools/**/check-*.ts',
				'tools/helix/**',
				'apps/desktop/src/main.ts',
			],
			// CI fails below these, set just under the coverage reached: raise
			// them as tests are added, never lower them.
			thresholds: {
				statements: 60,
				branches: 55,
				functions: 57,
				lines: 60,
			},
		},
	},
});
