/**
 * Date utilities for handling dates without timezone surprises.
 * 
 * AWS-Ready: Storing dates as YYYY-MM-DD strings ensures consistency
 * across different timezones and works better with DynamoDB queries.
 */

/**
 * Normalize various date formats to YYYY-MM-DD.
 * 
 * Supports:
 * - ISO format: "2025-11-08"
 * - European format: "08.11.2025" or "08/11/2025"
 * - Date object
 * 
 * @param input - Date in various formats
 * @returns Date string in YYYY-MM-DD format
 * @throws Error if format is not recognized
 */
export function toISODate(input: string | Date): string {
  if (input instanceof Date) {
    return input.toISOString().slice(0, 10);
  }
  
  // Already in YYYY-MM-DD format
  const isoMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return input;
  }
  
  // European format: DD.MM.YYYY or DD/MM/YYYY
  const euMatch = input.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (euMatch) {
    const [, day, month, year] = euMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Try parsing as Date
  const date = new Date(input);
  if (!isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10);
  }
  
  throw new Error(`Invalid date format: ${input}`);
}

/**
 * Get today's date in YYYY-MM-DD format.
 * 
 * @returns Today's date string
 */
export function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Parse YYYY-MM-DD string to Date object.
 * 
 * @param isoDate - Date string in YYYY-MM-DD format
 * @returns Date object
 */
export function parseISODate(isoDate: string): Date {
  return new Date(isoDate + 'T00:00:00');
}

/**
 * Format date for display in Lithuanian format.
 * 
 * @param isoDate - Date string in YYYY-MM-DD format
 * @returns Formatted date like "2025-11-08" or "2025 m. lapkritis 8 d."
 */
export function formatDate(isoDate: string): string {
  const date = parseISODate(isoDate);
  return new Intl.DateTimeFormat('lt-LT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}
