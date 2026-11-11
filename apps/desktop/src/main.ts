// SPDX-License-Identifier: GPL-3.0-or-later
import './app.css';

import { mount } from 'svelte';

import App from './App.svelte';
import { themes } from './lib/theme/theme-state.svelte.ts';

const target = document.querySelector('#app');

if (!target) {
	throw new Error('Missing #app element in index.html');
}

themes.start();
mount(App, { target });
