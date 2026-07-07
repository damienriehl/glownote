import { defineConfig } from 'vitest/config';
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';

export default defineConfig({
  // The Svelte plugin lets Vitest import and mount real `.svelte` components.
  // `preprocess` is passed inline (rather than via a root svelte.config.js) so
  // it stays scoped to the test build and does not perturb the WXT extension
  // build, which supplies its own Svelte config via @wxt-dev/module-svelte.
  plugins: [svelte({ preprocess: vitePreprocess() }), svelteTesting()],
  resolve: {
    // Use the browser build of Svelte inside the jsdom test environment.
    conditions: ['browser'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
  },
});
