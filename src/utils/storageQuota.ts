/**
 * Storage Quota Management (Demo-Grade)
 * 
 * LOCAL TEST: localStorage quota warnings (5MB typical)
 * PROD AWS: No client-side concerns - trust API Gateway rate limits
 * 
 * Demo simplification: No automatic cleanup or client-side rate limiting
 * - Show warnings only (no auto-delete)
 * - No trackAPIUsage() - trust server-side enforcement
 * - Respect 429 responses from API Gateway (handled in httpClient)
 */

import { IS_AWS_MODE } from '../config/env';
import { notificationService } from '../services/notificationService';

export const checkStorageQuota = (): {
  used: number;
  available: number;
  percentage: number;
} => {
  if (IS_AWS_MODE) {
    // AWS: No storage quota concerns
    return {
      used: 0,
      available: Number.MAX_SAFE_INTEGER,
      percentage: 0
    };
  }
  
  // LOCAL: Check localStorage quota
  let used = 0;
  const available = 5 * 1024 * 1024; // 5MB typical limit

  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      used += localStorage[key].length + key.length;
    }
  }

  return {
    used,
    available,
    percentage: (used / available) * 100
  };
};

export const isStorageQuotaNearLimit = (): boolean => {
  const { percentage } = checkStorageQuota();
  return percentage > 80;
};

/**
 * Show storage warning when quota is high (demo-grade)
 * 
 * Demo simplification: No automatic cleanup or deletion
 * User can export data and manually clean up if needed
 */
export const showStorageWarning = (): void => {
  const { percentage } = checkStorageQuota();
  
  if (percentage > 90) {
    notificationService.warning(
      `Saugykla beveik pilna (${percentage.toFixed(0)}%). ` +
      `Rekomenduojama eksportuoti duomenis.`
    );
  } else if (percentage > 80) {
    notificationService.warning(
      `Saugykla ${percentage.toFixed(0)}% pilna. ` +
      `Apsvarstykite duomenų eksportavimą.`
    );
  }
};

/**
 * Format bytes to human-readable size
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};
