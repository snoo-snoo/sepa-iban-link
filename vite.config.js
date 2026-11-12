import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/assets/',
  publicDir: false,
  build: {
    emptyOutDir: true,
    outDir: resolve(__dirname, 'public/assets'),
    manifest: 'manifest.json',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'static/src/js/main.js'),
      },
    },
  },
  test: {
    environment: 'node',
    include: ['static/src/js/**/*.test.js'],
  },
});
