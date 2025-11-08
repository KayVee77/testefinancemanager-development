/**
 * Transaction Store - Transaction State Management
 * 
 * This is a "thin store" - it ONLY manages state, NO business logic.
 * 
 * ⚠️ ARCHITECTURAL DECISION: Thin Store + Smart Service
 * 
 * Why this pattern?
 * - Store: Manages state (transactions array, loading, error)
 * - Service: Handles business logic (CRUD operations, environment switching, persistence)
 * - Hook: Combines store + service for clean component API
 * 
 * Benefits:
 * - Clear separation of concerns
 * - Easier to test (mock service, test store separately)
 * - Avoids duplication between store and service
 * - Single source of truth for business logic (service)
 * 
 * Components access this via useTransactions() hook (not directly).
 */

import { create } from 'zustand';
import { Transaction } from '../types/Transaction';

interface TransactionState {
  // State
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null; // Simple error message for UI display
  
  // State setters (called by service or hooks)
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearTransactions: () => void;
}

/**
 * Transaction Store
 * 
 * This store is just a state container.
 * All business logic lives in transactionService.ts.
 * 
 * The hook (useTransactions) combines this store with the service
 * to provide a clean API for components.
 */
export const useTransactionStore = create<TransactionState>((set) => ({
  // Initial state
  transactions: [],
  isLoading: false,
  error: null,
  
  /**
   * Replace entire transactions array
   * Used when loading from storage/API
   */
  setTransactions: (transactions) => 
    set({ transactions, isLoading: false, error: null }),
  
  /**
   * Add a single transaction (optimistic update)
   */
  addTransaction: (transaction) =>
    set((state) => ({
      transactions: [...state.transactions, transaction],
      error: null
    })),
  
  /**
   * Update a transaction (optimistic update)
   */
  updateTransaction: (id, updates) =>
    set((state) => ({
      transactions: state.transactions.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
      error: null
    })),
  
  /**
   * Remove a transaction (optimistic update)
   */
  removeTransaction: (id) =>
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
      error: null
    })),
  
  /**
   * Set loading state
   */
  setLoading: (isLoading) => 
    set({ isLoading }),
  
  /**
   * Set error message
   */
  setError: (error) => 
    set({ error, isLoading: false }),
  
  /**
   * Clear all transactions (used on logout)
   */
  clearTransactions: () => 
    set({ transactions: [], error: null })
}));

/*
 * 📝 USAGE NOTES:
 * 
 * DO NOT use this store directly in components!
 * Use the useTransactions() hook instead for clean component API.
 * 
 * The hook handles:
 * - Calling transactionService for CRUD operations
 * - Optimistic updates with rollback on error
 * - Loading transactions on mount
 * - Error handling and notifications
 */

/* 
 * 🏗️ ARCHITECTURE COMPARISON:
 * 
 * ❌ Fat Store (all logic in store):
 *    - Store has add/delete/update methods with API calls
 *    - Problems: Store becomes huge, hard to test, mixed concerns
 * 
 * ❌ Duplicate Logic (CRUD in both store AND service):
 *    - transactionStore.ts has CRUD methods
 *    - transactionService.ts also has CRUD methods
 *    - Problems: Which one to use? Duplication nightmare
 * 
 * ✅ Thin Store + Smart Service (our choice):
 *    - Store: Just state (transactions, loading, error)
 *    - Service: Business logic (if IS_AWS_MODE API else localStorage)
 *    - Hook: Combines both for clean component API
 *    - Benefits: Clear separation, easy to test, single source of truth
 * 
 * 🔄 OPTIMISTIC UPDATES PATTERN:
 * 
 * The hooks use this store's methods for optimistic updates:
 * 1. Update store immediately (optimistic)
 * 2. Call service to persist
 * 3. If service fails, rollback store update
 * 
 * This provides instant UI feedback while ensuring data consistency.
 */
