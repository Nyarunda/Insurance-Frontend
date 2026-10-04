/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  // One data source per build (FI1-Q2): `--mode backend` or VITE_DATA_SOURCE=backend.
  const dataSource = mode === 'backend' || env.VITE_DATA_SOURCE === 'backend' ? 'backend' : 'mock';
  // Same origin (FI1-Q3): the browser opens the app at the tenant's host name and `/api` is
  // forwarded to Django with that Host header unchanged, which is how the backend finds the tenant.
  const backendOrigin = env.BACKEND_ORIGIN || 'http://127.0.0.1:8000';
  // Development tenants use `<tenant>.localhost`: it resolves to the loopback address and is a
  // secure context over plain HTTP, so the cross-tab refresh lock works (FI1-A-F3).
  const allowedHosts = (env.FRONTEND_ALLOWED_HOSTS || '.localhost')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean);

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_DATA_SOURCE': JSON.stringify(dataSource),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      allowedHosts,
      proxy: {
        '/api': {target: backendOrigin, changeOrigin: false, xfwd: false},
      },
    },
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
      setupFiles: ['src/test/setup.ts'],
      restoreMocks: true,
      // Component journeys type through userEvent; on a busy machine one can outlast the 5 s
      // default. A wrong value still fails at once: only slow-but-correct runs use the budget.
      testTimeout: 30_000,
      // One copy of React Router: under Node, `react-router` resolves to its CommonJS build while
      // `react-router/dom` loads the ES build, and the two do not share router contexts.
      alias: [
        {find: /^react-router$/, replacement: path.resolve(__dirname, 'node_modules/react-router/dist/development/index.mjs')},
        {find: /^react-router\/dom$/, replacement: path.resolve(__dirname, 'node_modules/react-router/dist/development/dom-export.mjs')},
      ],
      server: {deps: {inline: [/react-router/]}},
    },
  };
});
