/**
 * DTO (Data Transfer Object) Utilities
 * 
 * This file provides conversion functions between different data formats:
 * - OLD format: { date: Date, amount: number } (used internally)
 * - NEW format: { postedAt: string, amountMinor: number } (used in API)
 * 
 * This "shim" approach allows us to refactor field names incrementally
 * without breaking existing code.
 * 
 * Phase 2.1: DTO shim at service boundary
 * Phase 3.x: Full refactor to use new field names everywhere
 */

import { Transaction } from '../types/Transaction';

/**
 * API Transaction format (NEW - what AWS Lambda expects)
 */
export interface ApiTransaction {
  id: string;
  userId: string;
  postedAt: string; // ISO date string "YYYY-MM-DD"
  amountMinor: number; // Amount in cents (e.g., 5000 = €50.00)
  type: 'income' | 'expense';
  category: string; // Category name
  description: string;
  createdAt: string; // ISO timestamp
}

/**
 * Convert internal Transaction to API format
 * 
 * @param transaction - Internal transaction object
 * @param userId - User ID to include in API payload
 * @returns API-compatible transaction
 */
export function toApiTransaction(transaction: Transaction, userId: string): ApiTransaction {
  return {
    id: transaction.id,
    userId: userId,
    postedAt: transaction.date instanceof Date 
      ? transaction.date.toISOString().split('T')[0] 
      : transaction.date,
    amountMinor: Math.round(transaction.amount * 100), // Convert euros to cents
    type: transaction.type,
    category: transaction.category,
    description: transaction.description,
    createdAt: transaction.createdAt instanceof Date
      ? transaction.createdAt.toISOString()
      : transaction.createdAt
  };
}

/**
 * Convert API format to internal Transaction
 * 
 * @param apiTx - API transaction object
 * @returns Internal transaction object
 */
export function fromApiTransaction(apiTx: ApiTransaction): Transaction {
  return {
    id: apiTx.id,
    date: new Date(apiTx.postedAt), // Parse date string to Date object
    amount: apiTx.amountMinor / 100, // Convert cents to euros
    type: apiTx.type,
    category: apiTx.category,
    description: apiTx.description,
    createdAt: new Date(apiTx.createdAt)
  };
}

/**
 * Normalize transaction (ensure correct format)
 * 
 * This is useful when loading from localStorage or API - ensures
 * date fields are Date objects, not strings.
 * 
 * @param tx - Transaction (possibly with string dates)
 * @returns Normalized transaction with Date objects
 */
export function normalizeTransaction(tx: any): Transaction {
  return {
    ...tx,
    date: tx.date instanceof Date ? tx.date : new Date(tx.date),
    createdAt: tx.createdAt instanceof Date ? tx.createdAt : new Date(tx.createdAt)
  };
}

/**
 * Batch conversion helpers
 */
export function toApiTransactions(transactions: Transaction[], userId: string): ApiTransaction[] {
  return transactions.map(tx => toApiTransaction(tx, userId));
}

export function fromApiTransactions(apiTransactions: ApiTransaction[]): Transaction[] {
  return apiTransactions.map(fromApiTransaction);
}

export function normalizeTransactions(transactions: any[]): Transaction[] {
  return transactions.map(normalizeTransaction);
}

/**
 * 📝 USAGE EXAMPLES:
 * 
 * In services (when calling API):
 * ```typescript
 * import { toApiTransaction, fromApiTransaction } from '@/lib/dto';
 * 
 * // Sending to API
 * const apiData = toApiTransaction(transaction, userId);
 * await http.post('/users/123/transactions', apiData);
 * 
 * // Receiving from API
 * const apiTx = await http.get<ApiTransaction>('/users/123/transactions/456');
 * const transaction = fromApiTransaction(apiTx);
 * ```
 * 
 * In storage (when loading from localStorage):
 * ```typescript
 * import { normalizeTransactions } from '@/lib/dto';
 * 
 * const raw = JSON.parse(localStorage.getItem('finance_123_transactions') || '[]');
 * const transactions = normalizeTransactions(raw); // Dates are now Date objects
 * ```
 * 
 * Benefits:
 * - ✅ Single source of truth for field mapping
 * - ✅ Type-safe conversions
 * - ✅ Easy to test
 * - ✅ Can be removed later when full refactor is done
 */
