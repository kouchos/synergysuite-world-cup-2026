import './app.css';
import { mount } from 'svelte';
import { registerSW } from 'virtual:pwa-register';
import App from './App.svelte';

// PWA service worker — precached app shell, auto-updates on new deploys.
// No-op in dev; only the production build emits a worker.
// The office TV runs this as an always-on installed PWA that never navigates,
// so it never re-checks for a new worker and can serve a stale bundle for
// days after a deploy. Force an hourly check via registration.update() —
// vite-plugin-pwa's `autoUpdate` mode then reloads on activation once a new
// worker is found, so a fix reaches the screen within the hour instead of
// waiting for someone to notice and reload it by hand.
registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    if (registration) setInterval(() => registration.update(), 60 * 60 * 1000);
  },
});

const app = mount(App, { target: document.getElementById('app') });

export default app;
