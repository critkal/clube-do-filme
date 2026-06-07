import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';

// A unique id for each deploy: the committed git SHA (what gh-pages publishes),
// falling back to a timestamp if git isn't available.
function getBuildId() {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return Date.now().toString(36);
  }
}

// Emits dist/version.json so a running tab can detect a newer deploy and reload.
function versionFilePlugin(buildId) {
  return {
    name: 'app-version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ version: buildId }),
      });
    },
  };
}

// For GitHub Pages project sites, production assets need the repo path prefix.
// Keep local dev at root for normal Vite behavior.
export default defineConfig(({ command }) => {
  const buildId = getBuildId();
  return {
    plugins: [react(), versionFilePlugin(buildId)],
    define: { __APP_VERSION__: JSON.stringify(buildId) },
    base: process.env.VITE_BASE || (command === 'build' ? '/clube-do-filme/' : '/'),
    server: {
      port: 5173,
    },
  };
});
