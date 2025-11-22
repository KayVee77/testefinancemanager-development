/**
 * Transaction Service - Transaction Business Logic
 * 
 * This service handles all transaction CRUD operations with dual-environment support.
 * 
 * ⚠️ ARCHITECTURAL DECISION: Keep userId explicit in all methods
 * 
 * Why explicit userId?
 * - Components need user object anyway (for display, navigation, etc.)
 * - Makes testing easier (no need to mock store)
 * - LOCAL mode needs userId for storage keys (finance_userId_transactions)
 * - Clearer API - you see exactly what's being passed
 * 
 * Pattern: Service contains business logic, store manages state, hook combines both.
 */

import { Transaction } from '../types/Transaction';
import { IS_AWS_MODE } from '../config/env';
import { getStoredTransactions, saveTransactions } from '../utils/storage';
import { http } from '../lib/http';
import { toApiTransaction, fromApiTransaction } from '../lib/dto';
import { notificationService } from './notificationService';
import { logger } from '../errors';
import { StorageError } from '../errors/ApplicationError';

/**
 * Transaction Service
 * 
 * Handles transaction operations for both LOCAL and AWS environments.
 * Store updates happen in the hooks, not here.
 */
export const transactionService = {
  /**
   * Load all transactions for a user
   * 
   * @param userId - User ID
   * @returns Array of transactions
   */
  async getAll(userId: string): Promise<Transaction[]> {
    try {
      if (IS_AWS_MODE) {
        // AWS: GET from API Gateway
        const apiTransactions = await http.get<any[]>(`/users/${userId}/transactions`);
        return apiTransactions.map(fromApiTransaction);
      } else {
        // LOCAL: Load from localStorage
        return await getStoredTransactions(userId);
      }
    } catch (error) {
      await logger.log(new StorageError(
        'Failed to load transactions',
        error
      ));
      notificationService.error('Nepavyko užkrauti transakcijų');
      throw error;
    }
  },

  /**
   * Create a new transaction
   * 
   * @param userId - User ID
   * @param data - Transaction data (without id)
   * @returns Created transaction with server-assigned ID
   */
  async create(
    userId: string,
    data: Omit<Transaction, 'id' | 'createdAt'>
  ): Promise<Transaction> {
    // Validate amount
    if (!data.amount || data.amount <= 0) {
      notificationService.error('Neteisinga suma. Suma turi būti didesnė už 0.');
      throw new Error('Invalid amount: must be greater than 0');
    }

    const newTransaction: Transaction = {
      ...data,
      id: Date.now().toString(),
      createdAt: new Date()
    };
    
    try {
      if (IS_AWS_MODE) {
        // AWS: POST to API Gateway → Lambda → DynamoDB
        const apiData = toApiTransaction(newTransaction, userId);
        const response = await http.post<any>(
          `/users/${userId}/transactions`,
          apiData
        );
        notificationService.success('Transakcija pridėta');
        // Server returns { success: true, transaction: {...} }
        return fromApiTransaction(response.transaction);
      } else {
        // LOCAL: Append to localStorage
        const transactions = await getStoredTransactions(userId);
        transactions.push(newTransaction);
        await saveTransactions(userId, transactions);
        
        notificationService.success('Transakcija pridėta');
        return newTransaction;
      }
    } catch (error) {
      await logger.log(new StorageError(
        'Failed to create transaction',
        error
      ));
      notificationService.error('Nepavyko pridėti transakcijos');
      throw error;
    }
  },
  
  /**
   * Delete a transaction
   * 
   * @param userId - User ID
   * @param id - Transaction ID
   */
  async delete(userId: string, id: string): Promise<void> {
    try {
      if (IS_AWS_MODE) {
        // AWS: DELETE to API Gateway
        await http.delete(`/users/${userId}/transactions/${id}`);
      } else {
        // LOCAL: Remove from localStorage
        const transactions = await getStoredTransactions(userId);
        const filtered = transactions.filter(t => t.id !== id);
        await saveTransactions(userId, filtered);
      }
      
      notificationService.success('Transakcija ištrinta');
    } catch (error) {
      await logger.log(new StorageError(
        'Failed to delete transaction',
        error
      ));
      notificationService.error('Nepavyko ištrinti transakcijos');
      throw error;
    }
  },
  
  /**
   * Update a transaction
   * 
   * @param userId - User ID
   * @param id - Transaction ID
   * @param updates - Partial transaction data
   */
  async update(userId: string, id: string, updates: Partial<Transaction>): Promise<void> {
    // Validate amount if being updated
    if (updates.amount !== undefined && updates.amount <= 0) {
      notificationService.error('Neteisinga suma. Suma turi būti didesnė už 0.');
      throw new Error('Invalid amount: must be greater than 0');
    }

    try {
      if (IS_AWS_MODE) {
        // AWS: PUT to API Gateway
        await http.put(`/users/${userId}/transactions/${id}`, updates);
      } else {
        // LOCAL: Update in localStorage
        const transactions = await getStoredTransactions(userId);
        const updated = transactions.map(t =>
          t.id === id ? { ...t, ...updates } : t
        );
        await saveTransactions(userId, updated);
      }
      
      notificationService.success('Transakcija atnaujinta');
    } catch (error) {
      await logger.log(new StorageError(
        'Failed to update transaction',
        error
      ));
      notificationService.error('Nepavyko atnaujinti transakcijos');
      throw error;
    }
  }
};

/*
 * 📝 USAGE NOTES:
 * 
 * DO NOT use this service directly in components!
 * Use the useTransactions() hook instead for clean component API.
 * 
 * The hook handles:
 * - Calling this service for CRUD operations
 * - Updating transactionStore with results
 * - Optimistic updates with rollback on error
 * - Loading transactions on mount
 * - Error handling and notifications
 */

/*
 * 🔄 ENVIRONMENT BEHAVIOR:
 * 
 * LOCAL mode (VITE_RUNTIME=local):
 * - getAll() → getStoredTransactions() → localStorage
 * - create() → append to array → saveTransactions()
 * - delete() → filter array → saveTransactions()
 * - update() → map array → saveTransactions()
 * 
 * AWS mode (VITE_RUNTIME=aws):
 * - getAll() → GET /users/{userId}/transactions → DynamoDB
 * - create() → POST /users/{userId}/transactions → DynamoDB
 * - delete() → DELETE /users/{userId}/transactions/{id} → DynamoDB
 * - update() → PUT /users/{userId}/transactions/{id} → DynamoDB
 * 
 * This service abstracts the environment differences.
 * Components don't need to know which mode they're in.
 */
