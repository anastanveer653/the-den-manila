import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths, so the built site works at a domain root or in a sub-folder.
  base: './',
  build: {
    // three.js is loaded as its own lazy chunk and is expected to be large.
    chunkSizeWarningLimit: 700,
  },
});
