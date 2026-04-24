import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// For GitHub Pages, set VITE_BASE to "/<repo-name>/" at build time.
// Locally the default "/" is correct.
export default defineConfig(() => ({
  plugins: [react()],
  base: process.env.VITE_BASE || '/',
  server: {
    port: 5173,
  },
}));
