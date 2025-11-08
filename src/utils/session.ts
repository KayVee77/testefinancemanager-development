/**
 * Session management utilities for handling user session timeouts
 * and idle detection.
 */

const SESSION_TIMESTAMP_KEY = 'finance_session_timestamp';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

/**
 * Updates the session timestamp to the current time.
 * Call this on user activity to keep the session alive.
 */
export const updateSessionTimestamp = (): void => {
  try {
    localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.error('Error updating session timestamp:', error);
  }
};

/**
 * Gets the last activity timestamp from storage.
 * 
 * @returns The timestamp of the last activity, or null if not found
 */
export const getSessionTimestamp = (): number | null => {
  try {
    const stored = localStorage.getItem(SESSION_TIMESTAMP_KEY);
    return stored ? parseInt(stored, 10) : null;
  } catch (error) {
    console.error('Error getting session timestamp:', error);
    return null;
  }
};

/**
 * Checks if the current session has expired based on the timeout period.
 * 
 * @param timeout - Optional timeout in milliseconds (defaults to 30 minutes)
 * @returns true if session has expired, false otherwise
 */
export const isSessionExpired = (timeout: number = SESSION_TIMEOUT): boolean => {
  const lastActivity = getSessionTimestamp();
  
  if (!lastActivity) {
    // No timestamp means no active session
    return false;
  }
  
  const now = Date.now();
  const timeSinceActivity = now - lastActivity;
  
  return timeSinceActivity >= timeout;
};

/**
 * Clears the session timestamp from storage.
 * Call this on logout.
 */
export const clearSessionTimestamp = (): void => {
  try {
    localStorage.removeItem(SESSION_TIMESTAMP_KEY);
  } catch (error) {
    console.error('Error clearing session timestamp:', error);
  }
};

/**
 * Gets the remaining time before session expires.
 * 
 * @param timeout - Optional timeout in milliseconds (defaults to 30 minutes)
 * @returns Remaining time in milliseconds, or 0 if expired
 */
export const getRemainingSessionTime = (timeout: number = SESSION_TIMEOUT): number => {
  const lastActivity = getSessionTimestamp();
  
  if (!lastActivity) {
    return timeout;
  }
  
  const now = Date.now();
  const timeSinceActivity = now - lastActivity;
  const remaining = timeout - timeSinceActivity;
  
  return Math.max(0, remaining);
};
