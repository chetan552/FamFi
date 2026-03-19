import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';

// ─── Native ping (no CORS restrictions on native fetch) ───────────────────────
const PING_URL = 'https://clients3.google.com/generate_204';
const PING_TIMEOUT_MS = 5000;

async function pingNative(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
    const res = await fetch(PING_URL, {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timerId);
    return res.status < 500;
  } catch {
    return false;
  }
}

export interface NetworkStatus {
  isOnline: boolean;
  recheck: () => Promise<void>;
}

/**
 * Cross-platform network status hook.
 *
 * - **Web**: uses `navigator.onLine` + browser `online`/`offline` events
 *   (avoids CORS errors that would occur when fetching an external URL from a browser).
 * - **iOS / Android**: pings Google's generate_204 endpoint via native fetch
 *   and re-checks whenever the app returns to the foreground.
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(true);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const recheck = useCallback(async () => {
    if (Platform.OS === 'web') {
      setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    } else {
      const online = await pingNative();
      setIsOnline(online);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Browser native events — no fetch required, no CORS issues
      setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      if (typeof window !== 'undefined') {
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
        };
      }
    } else {
      // Native: initial ping + re-ping when app returns to foreground
      recheck();

      const subscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
        if (nextState === 'active' && appState.current !== 'active') {
          await recheck();
        }
        appState.current = nextState;
      });

      return () => subscription.remove();
    }
  }, [recheck]);

  return { isOnline, recheck };
}
