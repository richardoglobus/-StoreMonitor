import { useEffect, useRef, useCallback } from "react";

// defaults — overridden by server settings

const ACTIVITY_EVENTS = [
  "mousemove", "mousedown", "keydown", "touchstart",
  "scroll", "click", "wheel", "pointermove"
];

interface UseInactivityLogoutOptions {
  onLogout: () => void;
  onWarn?: (secondsLeft: number) => void;
  enabled?: boolean;
  timeoutMs?: number;
  warnBeforeMs?: number;
}

export function useInactivityLogout({ onLogout, onWarn, enabled = true, timeoutMs = 60_000, warnBeforeMs = 10_000 }: UseInactivityLogoutOptions) {
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warned = useRef(false);

  const clearTimers = useCallback(() => {
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
    if (warnTimer.current) clearTimeout(warnTimer.current);
  }, []);

  const resetTimer = useCallback(() => {
    if (!enabled) return;
    clearTimers();
    warned.current = false;

    warnTimer.current = setTimeout(() => {
      if (!warned.current) {
        warned.current = true;
        const secondsLeft = Math.round((timeoutMs - (timeoutMs - warnBeforeMs)) / 1000);
        onWarn?.(secondsLeft);
      }
    }, timeoutMs - warnBeforeMs);

    logoutTimer.current = setTimeout(() => {
      onLogout();
    }, timeoutMs);
  }, [enabled, onLogout, onWarn, clearTimers]);

  useEffect(() => {
    if (!enabled) return;
    resetTimer();
    ACTIVITY_EVENTS.forEach(evt => window.addEventListener(evt, resetTimer, { passive: true }));
    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach(evt => window.removeEventListener(evt, resetTimer));
    };
  }, [enabled, resetTimer, clearTimers]);
}
