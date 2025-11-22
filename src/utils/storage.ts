import { Transaction, Category } from '../types/Transaction';
import { StorageError, logger } from '../errors';
import { isStorageQuotaNearLimit } from './storageQuota';
import { IS_AWS_MODE, getApiUrl } from '../config/env';
import { httpClient } from './http';

// Note: Client-side encryption removed for AWS deployment readiness
// In production, data will be encrypted at rest by DynamoDB (AWS KMS)
// and in transit via HTTPS (API Gateway)

// Note: Client-side encryption removed for AWS deployment readiness
// In production, data will be encrypted at rest by DynamoDB (AWS KMS)
// and in transit via HTTPS (API Gateway)

const getStorageKey = (userId: string, key: string): string => {
  return `finance_${userId}_${key}`;
};

export const getStoredTransactions = async (userId: string): Promise<Transaction[]> => {
  try {
    if (IS_AWS_MODE) {
      // AWS: Fetch from API (using REST URL pattern)
      const data = await httpClient.get<Transaction[]>(
        getApiUrl(`/users/${userId}/transactions`),
        {
          retry: {
            maxRetries: 3,
            backoff: 'exponential'
          }
        }
      );
      
      // Convert date strings to Date objects
      return data.map((t: any) => ({
        ...t,
        date: new Date(t.date),
        createdAt: new Date(t.createdAt)
      }));
    } else {
      // LOCAL: Load from localStorage
      const stored = localStorage.getItem(getStorageKey(userId, 'transactions'));
      if (!stored) return [];
      
      const transactions = JSON.parse(stored);
      return transactions.map((t: any) => ({
        ...t,
        date: new Date(t.date),
        createdAt: new Date(t.createdAt)
      }));
    }
  } catch (error) {
    const storageError = new StorageError(
      'Nepavyko užkrauti transakcijų',
      error
    );
    await logger.log(storageError);
    return [];
  }
};

export const saveTransactions = async (userId: string, transactions: Transaction[]): Promise<void> => {
  try {
    if (IS_AWS_MODE) {
      // AWS: This path should not be used - transactionService handles AWS CRUD operations
      // individually. This is here only as a fallback.
      // In practice, use transactionService.create() for new transactions.
      throw new StorageError(
        'saveTransactions() should not be called in AWS mode. Use transactionService instead.'
      );
    } else {
      // LOCAL: Save to localStorage
      // Check storage quota before saving
      if (isStorageQuotaNearLimit()) {
        const storageError = new StorageError(
          'Saugykla beveik pilna. Pašalinkite senus įrašus arba eksportuokite duomenis.'
        );
        await logger.log(storageError);
        throw storageError;
      }
      
      const json = JSON.stringify(transactions);
      localStorage.setItem(getStorageKey(userId, 'transactions'), json);
    }
  } catch (error) {
    // Check for quota exceeded error
    if (error instanceof DOMException && error.code === 22) {
      const storageError = new StorageError(
        'Saugykla pilna. Pašalinkite senus įrašus.'
      );
      await logger.log(storageError);
      throw storageError;
    }
    
    // Re-throw StorageError
    if (error instanceof StorageError) {
      throw error;
    }
    
    // Generic storage error
    const storageError = new StorageError(
      'Nepavyko išsaugoti transakcijų. Bandykite dar kartą.',
      error
    );
    await logger.log(storageError);
    throw storageError;
  }
};

export const getStoredCategories = async (userId: string): Promise<Category[]> => {
  try {
    if (IS_AWS_MODE) {
      // AWS: Fetch from API with userId in path
      const data = await httpClient.get<Category[]>(
        getApiUrl(`/users/${userId}/categories`),
        {
          retry: {
            maxRetries: 3,
            backoff: 'exponential'
          }
        }
      );
      
      return data.length > 0 ? data : getDefaultCategories();
    } else {
      // LOCAL: Load from localStorage
      const stored = localStorage.getItem(getStorageKey(userId, 'categories'));
      if (!stored) return getDefaultCategories();
      
      return JSON.parse(stored);
    }
  } catch (error) {
    const storageError = new StorageError(
      'Nepavyko užkrauti kategorijų',
      error
    );
    await logger.log(storageError);
    return getDefaultCategories();
  }
};

export const saveCategories = async (userId: string, categories: Category[]): Promise<void> => {
  try {
    if (IS_AWS_MODE) {
      // AWS: Save each category individually to match server expectations
      await Promise.all(
        categories.map(category =>
          httpClient.post(
            getApiUrl(`/users/${userId}/categories`),
            category,
            {
              retry: {
                maxRetries: 2,
                backoff: 'exponential'
              },
              idempotent: true,
              timeout: 10000
            }
          )
        )
      );
    } else {
      // LOCAL: Save to localStorage
      if (isStorageQuotaNearLimit()) {
        const storageError = new StorageError(
          'Saugykla beveik pilna. Pašalinkite senus įrašus arba eksportuokite duomenis.'
        );
        await logger.log(storageError);
        throw storageError;
      }
      
      localStorage.setItem(getStorageKey(userId, 'categories'), JSON.stringify(categories));
    }
  } catch (error) {
    // Check for quota exceeded error
    if (error instanceof DOMException && error.code === 22) {
      const storageError = new StorageError(
        'Saugykla pilna. Pašalinkite senus įrašus.'
      );
      await logger.log(storageError);
      throw storageError;
    }
    
    // Re-throw StorageError
    if (error instanceof StorageError) {
      throw error;
    }
    
    // Generic storage error
    const storageError = new StorageError(
      'Nepavyko išsaugoti kategorijų. Bandykite dar kartą.',
      error
    );
    await logger.log(storageError);
    throw storageError;
  }
};

const getDefaultCategories = (): Category[] => [
  { id: '1', name: 'Maistas', color: '#10B981', icon: 'utensils', type: 'expense' },
  { id: '2', name: 'Transportas', color: '#3B82F6', icon: 'car', type: 'expense' },
  { id: '3', name: 'Pramogos', color: '#F59E0B', icon: 'gamepad-2', type: 'expense' },
  { id: '4', name: 'Sveikatos priežiūra', color: '#EF4444', icon: 'heart', type: 'expense' },
  { id: '5', name: 'Mokesčiai', color: '#8B5CF6', icon: 'receipt', type: 'expense' },
  { id: '6', name: 'Drabužiai', color: '#F97316', icon: 'shirt', type: 'expense' },
  { id: '7', name: 'Atlyginimas', color: '#22C55E', icon: 'briefcase', type: 'income' },
  { id: '8', name: 'Investicijos', color: '#06B6D4', icon: 'trending-up', type: 'income' },
  { id: '9', name: 'Kita', color: '#6B7280', icon: 'more-horizontal', type: 'expense' },
];