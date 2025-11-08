/**
 * useTransactions Hook - Transaction API for Components
 * 
 * This hook combines transactionStore (state) + transactionService (business logic)
 * to provide a clean API for components.
 * 
 * Components should use THIS hook, not the store or service directly.
 * 
 * Features:
 * - Auto-loads transactions when user changes
 * - Optimistic updates with rollback on error
 * - Environment-aware (LOCAL/AWS)
 * - Error handling and notifications
 */

import { useEffect, useCallback } from 'react';
import { useTransactionStore } from '../stores/transactionStore';
import { useAuthStore } from '../stores/authStore';
import { transactionService } from '../services/transactionService';
import { Transaction } from '../types/Transaction';

/**
 * Transactions hook
 * 
 * @returns Transaction state and actions
 */
export const useTransactions = () => {
  const { user } = useAuthStore();
  const {
    transactions,
    isLoading,
    error,
    setTransactions,
    addTransaction,
    updateTransaction,
    removeTransaction,
    setLoading,
    setError,
    clearTransactions
  } = useTransactionStore();
  
  /**
   * Load transactions for current user
   * 
   * ⚠️ IMPORTANT: Wrapped in useCallback to prevent infinite loops in useEffect
   */
  const loadTransactions = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const transactions = await transactionService.getAll(userId);
      setTransactions(transactions);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load transactions');
    }
  }, [setLoading, setTransactions, setError]);
  
  /**
   * Auto-load transactions when user changes
   * 
   * This runs once per user (not on every render)
   */
  useEffect(() => {
    if (user) {
      loadTransactions(user.id);
    } else {
      // Clear transactions when user logs out
      clearTransactions();
    }
  }, [user?.id, loadTransactions, clearTransactions]);
  
  /**
   * Add a new transaction (with optimistic update)
   * 
   * @param data - Transaction data (without id)
   */
  const add = async (data: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (!user) throw new Error('User not authenticated');
    
    // Create optimistic transaction for immediate UI update
    const optimisticTransaction: Transaction = {
      ...data,
      id: `temp_${Date.now()}`,
      createdAt: new Date()
    };
    
    // Optimistic update (instant UI feedback)
    addTransaction(optimisticTransaction);
    
    try {
      // Call service to persist
      const savedTransaction = await transactionService.create(user.id, data);
      
      // Replace optimistic with real transaction
      updateTransaction(optimisticTransaction.id, savedTransaction);
    } catch (error) {
      // Rollback on error
      removeTransaction(optimisticTransaction.id);
      throw error;
    }
  };
  
  /**
   * Delete a transaction (with optimistic update)
   * 
   * @param id - Transaction ID
   */
  const remove = async (id: string) => {
    if (!user) throw new Error('User not authenticated');
    
    // Save previous state for rollback
    const previousTransactions = [...transactions];
    
    // Optimistic update (instant UI feedback)
    removeTransaction(id);
    
    try {
      // Call service to persist
      await transactionService.delete(user.id, id);
    } catch (error) {
      // Rollback on error
      setTransactions(previousTransactions);
      throw error;
    }
  };
  
  /**
   * Update a transaction (with optimistic update)
   * 
   * @param id - Transaction ID
   * @param updates - Partial transaction data
   */
  const update = async (id: string, updates: Partial<Transaction>) => {
    if (!user) throw new Error('User not authenticated');
    
    // Save previous state for rollback
    const previousTransactions = [...transactions];
    
    // Optimistic update (instant UI feedback)
    updateTransaction(id, updates);
    
    try {
      // Call service to persist
      await transactionService.update(user.id, id, updates);
    } catch (error) {
      // Rollback on error
      setTransactions(previousTransactions);
      throw error;
    }
  };
  
  /**
   * Manually refresh transactions
   * 
   * Useful after external updates or for pull-to-refresh
   */
  const refresh = () => {
    if (user) {
      return loadTransactions(user.id);
    }
  };
  
  return {
    // State
    transactions,
    isLoading,
    error,
    
    // Actions
    add,
    remove,
    update,
    refresh
  };
};

/*
 * 📝 USAGE EXAMPLE:
 * 
 * function TransactionList() {
 *   const { transactions, isLoading, remove } = useTransactions();
 *   
 *   if (isLoading) return <LoadingSpinner />;
 *   
 *   return (
 *     <div>
 *       {transactions.map(t => (
 *         <TransactionCard 
 *           key={t.id} 
 *           transaction={t}
 *           onDelete={() => remove(t.id)}
 *         />
 *       ))}
 *     </div>
 *   );
 * }
 * 
 * function TransactionForm() {
 *   const { add } = useTransactions();
 *   
 *   const handleSubmit = async (data) => {
 *     try {
 *       await add(data);
 *       onClose(); // Form closes, transaction appears instantly in list
 *     } catch (error) {
 *       // Error notification already shown
 *     }
 *   };
 * }
 */

/*
 * ⚡ OPTIMISTIC UPDATES EXPLAINED:
 * 
 * This hook uses "optimistic updates" for better UX:
 * 
 * Traditional flow (slow):
 * 1. User clicks "Delete"
 * 2. Show loading spinner
 * 3. Wait for server response (500ms-2s)
 * 4. Remove from UI
 * 
 * Optimistic flow (instant):
 * 1. User clicks "Delete"
 * 2. Remove from UI immediately (optimistic)
 * 3. Send delete request in background
 * 4. If it fails, restore the item (rollback)
 * 
 * Benefits:
 * - Instant UI feedback
 * - Feels much faster
 * - Better user experience
 * 
 * Trade-off:
 * - Slightly more complex code
 * - Need rollback logic for errors
 * - Worth it for this demo project!
 */

/*
 * 🔄 WHY useCallback IS CRITICAL:
 * 
 * Without useCallback:
 * ```typescript
 * const loadTransactions = async (userId) => { ... }; // ❌ Recreated every render
 * 
 * useEffect(() => {
 *   if (user) loadTransactions(user.id);
 * }, [user?.id, loadTransactions]); // ❌ Runs infinitely!
 * ```
 * 
 * Problem: loadTransactions reference changes every render
 * → useEffect sees "new dependency" → runs again
 * → Component re-renders → loadTransactions recreated
 * → useEffect runs again → INFINITE LOOP!
 * 
 * With useCallback:
 * ```typescript
 * const loadTransactions = useCallback(async (userId) => { ... }, [deps]); // ✅ Memoized
 * 
 * useEffect(() => {
 *   if (user) loadTransactions(user.id);
 * }, [user?.id, loadTransactions]); // ✅ Stable reference, runs once per user
 * ```
 * 
 * Solution: useCallback memoizes the function
 * → Same reference across renders (unless deps change)
 * → useEffect only runs when user.id actually changes
 * → No infinite loop!
 */
