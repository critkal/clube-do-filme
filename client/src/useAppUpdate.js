import { useEffect, useState } from 'react';

// Baked into the bundle at build time (see vite.config.js `define`).
const CURRENT_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Detects when a newer build has been deployed while this tab is open.
 *
 * Compares the version baked into the running bundle against dist/version.json,
 * which is regenerated on every build. Returns true once a newer deploy is seen
 * so the UI can prompt the user to reload.
 */
export default function useAppUpdate() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    // In dev there is no published version.json to poll, and assets hot-reload.
    if (import.meta.env.DEV) return;

    let cancelled = false;

    async function check() {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const { version } = await res.json();
        if (!cancelled && version && version !== CURRENT_VERSION) {
          setUpdateReady(true);
        }
      } catch {
        // Offline or transient network error — try again on the next tick.
      }
    }

    check();
    const id = setInterval(check, POLL_INTERVAL);
    // Re-check as soon as the user comes back to the tab.
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return updateReady;
}
