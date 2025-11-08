import { useEffect, useRef, useCallback } from 'react';
import { updateSessionTimestamp } from '../utils/session';

/**
 * Custom hook that detects user inactivity and triggers a callback
 * after a specified timeout period.
 * 
 * @param onIdle - Callback function to execute when user becomes idle
 * @param timeout - Inactivity timeout in milliseconds (default: 30 minutes)
 * @param events - Array of DOM events to listen for activity (default: common user events)
 */
export const useIdleTimer = (
  onIdle: () => void,
  timeout: number = 30 * 60 * 1000,
  events: string[] = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'mousemove']
) => {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const onIdleRef = useRef(onIdle);

  // Keep onIdle reference up to date
  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  const resetTimer = useCallback(() => {
    // Clear existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Update session timestamp
    updateSessionTimestamp();

    // Set new timer
    timerRef.current = setTimeout(() => {
      onIdleRef.current();
    }, timeout);
  }, [timeout]);

  useEffect(() => {
    // Initialize timer on mount
    resetTimer();

    // Add event listeners for user activity
    events.forEach(event => {
      document.addEventListener(event, resetTimer, { passive: true });
    });

    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [resetTimer, events]);

  // Return a manual reset function in case needed
  return { resetTimer };
};
