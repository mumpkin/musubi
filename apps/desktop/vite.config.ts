import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

// Port expected by `src-tauri/tauri.conf.json` (devUrl)
const DEV_SERVER_PORT = 1420;

export default defineConfig({
	plugins: [svelte()],
	clearScreen: false,
	server: {
		port: DEV_SERVER_PORT,
		strictPort: true,
		watch: { ignored: ['**/src-tauri/**'] },
	},
	envPrefix: ['VITE_', 'TAURI_ENV_'],
	build: {
		target: 'es2024',
		sourcemap: true,
	},
});
