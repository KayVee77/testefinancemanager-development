/**
 * Money utilities for handling amounts as minor units (cents).
 * 
 * AWS-Ready: Storing amounts as integers prevents JavaScript float precision errors
 * and works better with DynamoDB Number type.
 * 
 * Examples:
 * - €125.50 stored as 12550 (cents)
 * - €1,234.56 stored as 123456 (cents)
 */

/**
 * Parse user input string to minor units (cents).
 * Handles Lithuanian format with spaces and commas: "1 234,56"
 * Also handles standard format: "1234.56"
 * 
 * @param input - Amount string in various formats
 * @returns Amount in cents (integer)
 * @throws Error if input is invalid
 */
export function parseAmountToMinor(input: string): number {
  // Remove all spaces and replace comma with dot
  const cleaned = input.replace(/\s/g, '').replace(',', '.');
  const value = Number(cleaned);
  
  if (!Number.isFinite(value)) {
    throw new Error('Invalid amount format');
  }
  
  // Round to handle floating point precision issues
  return Math.round(value * 100);
}

/**
 * Convert minor units (cents) back to decimal amount.
 * 
 * @param minor - Amount in cents
 * @returns Amount as decimal number
 */
export function fromMinor(minor: number): number {
  return minor / 100;
}

/**
 * Format amount in minor units for display with currency symbol.
 * 
 * @param minor - Amount in cents
 * @param currency - ISO currency code (default: EUR)
 * @returns Formatted string like "€125.50" or "125,50 €"
 */
export function formatAmount(minor: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('lt-LT', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(fromMinor(minor));
}

/**
 * Convert legacy float amount to minor units.
 * Used for migration from old data format.
 * 
 * @param amount - Amount as float
 * @returns Amount in cents (integer)
 */
export function toMinor(amount: number): number {
  return Math.round(amount * 100);
}
