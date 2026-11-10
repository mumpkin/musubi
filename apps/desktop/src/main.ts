// SPDX-License-Identifier: GPL-3.0-or-later
import './app.css';

import { mount } from 'svelte';

import App from './App.svelte';

const target = document.querySelector('#app');

if (!target) {
	throw new Error('Missing #app element in index.html');
}

mount(App, { target });
