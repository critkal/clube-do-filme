import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// For GitHub Pages project sites, production assets need the repo path prefix.
// Keep local dev at root for normal Vite behavior.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: process.env.VITE_BASE || (command === 'build' ? '/clube-do-filme/' : '/'),
  server: {
    port: 5173,
  },
}));
