import './app.css';
import { mount } from 'svelte';
import { registerSW } from 'virtual:pwa-register';
import App from './App.svelte';

// PWA service worker — precached app shell, auto-updates on new deploys.
// No-op in dev; only the production build emits a worker.
registerSW({ immediate: true });

const app = mount(App, { target: document.getElementById('app') });

export default app;
