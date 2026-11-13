import { defineConfig } from 'vitest/config';

// GitHub Pages serves the site from https://<user>.github.io/quoridor-clash/
export default defineConfig({
  base: '/quoridor-clash/',
  build: { target: 'es2022' },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
