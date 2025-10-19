import { Transaction, Category } from '../types/Transaction';

const getStorageKey = (userId: string, key: string): string => {
  return `finance_${userId}_${key}`;
};

export const getStoredTransactions = (userId: string): Transaction[] => {
  try {
    const stored = localStorage.getItem(getStorageKey(userId, 'transactions'));
    if (!stored) return [];
    
    const transactions = JSON.parse(stored);
    return transactions.map((t: any) => ({
      ...t,
      date: new Date(t.date),
      createdAt: new Date(t.createdAt)
    }));
  } catch (error) {
    console.error('Error loading transactions:', error);
    return [];
  }
};

export const saveTransactions = (userId: string, transactions: Transaction[]): void => {
  try {
    localStorage.setItem(getStorageKey(userId, 'transactions'), JSON.stringify(transactions));
  } catch (error) {
    console.error('Error saving transactions:', error);
  }
};

export const getStoredCategories = (userId: string): Category[] => {
  try {
    const stored = localStorage.getItem(getStorageKey(userId, 'categories'));
    if (!stored) return getDefaultCategories();
    
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error loading categories:', error);
    return getDefaultCategories();
  }
};

export const saveCategories = (userId: string, categories: Category[]): void => {
  try {
    localStorage.setItem(getStorageKey(userId, 'categories'), JSON.stringify(categories));
  } catch (error) {
    console.error('Error saving categories:', error);
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