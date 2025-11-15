import { describe, it, expect } from 'vitest';
import {
  getTotalIncome,
  getTotalExpenses,
  getBalance,
  calculateMonthlyData,
  calculateCategorySummary,
} from './calculations';
import { Transaction } from '../types/Transaction';

// Helper to create test transactions
const createTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: '1',
  amount: 100,
  description: 'Test transaction',
  category: 'Test Category',
  type: 'expense',
  date: new Date('2025-11-01'),
  createdAt: new Date('2025-11-01'),
  ...overrides,
});

describe('calculations.ts - Financial Calculations', () => {
  describe('getTotalIncome', () => {
    it('calculates total income from mixed transactions', () => {
      const transactions: Transaction[] = [
        createTransaction({ type: 'income', amount: 1000 }),
        createTransaction({ type: 'expense', amount: 200 }),
        createTransaction({ type: 'income', amount: 500 }),
      ];

      const result = getTotalIncome(transactions);

      expect(result).toBe(1500);
    });

    it('returns zero for empty array', () => {
      const result = getTotalIncome([]);

      expect(result).toBe(0);
    });

    it('returns zero when there are only expenses', () => {
      const transactions: Transaction[] = [
        createTransaction({ type: 'expense', amount: 100 }),
        createTransaction({ type: 'expense', amount: 200 }),
      ];

      const result = getTotalIncome(transactions);

      expect(result).toBe(0);
    });

    it('handles decimal amounts correctly', () => {
      const transactions: Transaction[] = [
        createTransaction({ type: 'income', amount: 1000.50 }),
        createTransaction({ type: 'income', amount: 250.25 }),
      ];

      const result = getTotalIncome(transactions);

      expect(result).toBe(1250.75);
    });

    it('ignores expenses in calculation', () => {
      const transactions: Transaction[] = [
        createTransaction({ type: 'income', amount: 1000 }),
        createTransaction({ type: 'expense', amount: 500 }),
        createTransaction({ type: 'expense', amount: 300 }),
      ];

      const result = getTotalIncome(transactions);

      expect(result).toBe(1000);
    });
  });

  describe('getTotalExpenses', () => {
    it('calculates total expenses from mixed transactions', () => {
      const transactions: Transaction[] = [
        createTransaction({ type: 'expense', amount: 200 }),
        createTransaction({ type: 'income', amount: 1000 }),
        createTransaction({ type: 'expense', amount: 300 }),
      ];

      const result = getTotalExpenses(transactions);

      expect(result).toBe(500);
    });

    it('returns zero for empty array', () => {
      const result = getTotalExpenses([]);

      expect(result).toBe(0);
    });

    it('returns zero when there are only income transactions', () => {
      const transactions: Transaction[] = [
        createTransaction({ type: 'income', amount: 1000 }),
        createTransaction({ type: 'income', amount: 500 }),
      ];

      const result = getTotalExpenses(transactions);

      expect(result).toBe(0);
    });

    it('handles decimal amounts correctly', () => {
      const transactions: Transaction[] = [
        createTransaction({ type: 'expense', amount: 50.50 }),
        createTransaction({ type: 'expense', amount: 25.25 }),
      ];

      const result = getTotalExpenses(transactions);

      expect(result).toBe(75.75);
    });

    it('ignores income in calculation', () => {
      const transactions: Transaction[] = [
        createTransaction({ type: 'expense', amount: 200 }),
        createTransaction({ type: 'income', amount: 1000 }),
        createTransaction({ type: 'income', amount: 500 }),
      ];

      const result = getTotalExpenses(transactions);

      expect(result).toBe(200);
    });
  });

  describe('getBalance', () => {
    it('calculates positive balance correctly', () => {
      const transactions: Transaction[] = [
        createTransaction({ type: 'income', amount: 1500 }),
        createTransaction({ type: 'expense', amount: 500 }),
      ];

      const result = getBalance(transactions);

      expect(result).toBe(1000);
    });

    it('calculates negative balance correctly', () => {
      const transactions: Transaction[] = [
        createTransaction({ type: 'income', amount: 500 }),
        createTransaction({ type: 'expense', amount: 1500 }),
      ];

      const result = getBalance(transactions);

      expect(result).toBe(-1000);
    });

    it('returns zero for empty array', () => {
      const result = getBalance([]);

      expect(result).toBe(0);
    });

    it('returns positive value when only income exists', () => {
      const transactions: Transaction[] = [
        createTransaction({ type: 'income', amount: 1000 }),
      ];

      const result = getBalance(transactions);

      expect(result).toBe(1000);
    });

    it('returns negative value when only expenses exist', () => {
      const transactions: Transaction[] = [
        createTransaction({ type: 'expense', amount: 500 }),
      ];

      const result = getBalance(transactions);

      expect(result).toBe(-500);
    });

    it('handles multiple transactions correctly', () => {
      const transactions: Transaction[] = [
        createTransaction({ type: 'income', amount: 2000 }),
        createTransaction({ type: 'expense', amount: 300 }),
        createTransaction({ type: 'income', amount: 500 }),
        createTransaction({ type: 'expense', amount: 150.50 }),
      ];

      const result = getBalance(transactions);

      expect(result).toBe(2049.50);
    });
  });

  describe('calculateCategorySummary', () => {
    it('groups expenses by category correctly', () => {
      const transactions: Transaction[] = [
        createTransaction({ type: 'expense', category: 'Maistas', amount: 100 }),
        createTransaction({ type: 'expense', category: 'Transportas', amount: 50 }),
        createTransaction({ type: 'expense', category: 'Maistas', amount: 75 }),
      ];

      const result = calculateCategorySummary(transactions, 'expense');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        category: 'Maistas',
        amount: 175,
      });
      expect(result[1]).toMatchObject({
        category: 'Transportas',
        amount: 50,
      });
    });

    it('groups income by category correctly', () => {
      const transactions: Transaction[] = [
        createTransaction({ type: 'income', category: 'Atlyginimas', amount: 1500 }),
        createTransaction({ type: 'income', category: 'Premija', amount: 500 }),
        createTransaction({ type: 'income', category: 'Atlyginimas', amount: 1500 }),
      ];

      const result = calculateCategorySummary(transactions, 'income');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        category: 'Atlyginimas',
        amount: 3000,
      });
      expect(result[1]).toMatchObject({
        category: 'Premija',
        amount: 500,
      });
    });

    it('calculates percentages correctly', () => {
      const transactions: Transaction[] = [
        createTransaction({ type: 'expense', category: 'Maistas', amount: 200 }),
        createTransaction({ type: 'expense', category: 'Transportas', amount: 50 }),
        createTransaction({ type: 'expense', category: 'Pramogos', amount: 50 }),
      ];

      const result = calculateCategorySummary(transactions, 'expense');

      // Total = 300, so Maistas should be 200/300 * 100 = 66.67%
      expect(result[0].percentage).toBeCloseTo(66.67, 1);
      // Transportas and Pramogos should each be 50/300 * 100 = 16.67%
      expect(result[1].percentage).toBeCloseTo(16.67, 1);
      expect(result[2].percentage).toBeCloseTo(16.67, 1);
    });

    it('sorts categories by amount in descending order', () => {
      const transactions: Transaction[] = [
        createTransaction({ type: 'expense', category: 'A', amount: 50 }),
        createTransaction({ type: 'expense', category: 'B', amount: 200 }),
        createTransaction({ type: 'expense', category: 'C', amount: 100 }),
      ];

      const result = calculateCategorySummary(transactions, 'expense');

      expect(result[0].category).toBe('B');
      expect(result[0].amount).toBe(200);
      expect(result[1].category).toBe('C');
      expect(result[1].amount).toBe(100);
      expect(result[2].category).toBe('A');
      expect(result[2].amount).toBe(50);
    });

    it('filters by transaction type correctly', () => {
      const transactions: Transaction[] = [
        createTransaction({ type: 'expense', category: 'Maistas', amount: 100 }),
        createTransaction({ type: 'income', category: 'Atlyginimas', amount: 1500 }),
        createTransaction({ type: 'expense', category: 'Transportas', amount: 50 }),
      ];

      const expenseSummary = calculateCategorySummary(transactions, 'expense');
      const incomeSummary = calculateCategorySummary(transactions, 'income');

      expect(expenseSummary).toHaveLength(2);
      expect(incomeSummary).toHaveLength(1);
      expect(incomeSummary[0].category).toBe('Atlyginimas');
    });

    it('returns empty array for empty transactions', () => {
      const result = calculateCategorySummary([], 'expense');

      expect(result).toEqual([]);
    });

    it('returns empty array when no transactions match type', () => {
      const transactions: Transaction[] = [
        createTransaction({ type: 'income', amount: 1000 }),
      ];

      const result = calculateCategorySummary(transactions, 'expense');

      expect(result).toEqual([]);
    });

    it('includes color property for each category', () => {
      const transactions: Transaction[] = [
        createTransaction({ type: 'expense', category: 'Maistas', amount: 100 }),
      ];

      const result = calculateCategorySummary(transactions, 'expense');

      expect(result[0]).toHaveProperty('color');
      expect(typeof result[0].color).toBe('string');
      expect(result[0].color).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });

  describe('calculateMonthlyData', () => {
    it('calculates monthly data for last 12 months', () => {
      const transactions: Transaction[] = [
        createTransaction({ date: new Date('2025-11-15'), type: 'income', amount: 1500 }),
        createTransaction({ date: new Date('2025-11-20'), type: 'expense', amount: 500 }),
        createTransaction({ date: new Date('2025-10-15'), type: 'income', amount: 2000 }),
      ];

      const result = calculateMonthlyData(transactions);

      // Should return 12 months of data
      expect(result).toHaveLength(12);
      // Each month should have the required properties
      expect(result[0]).toHaveProperty('month');
      expect(result[0]).toHaveProperty('income');
      expect(result[0]).toHaveProperty('expenses');
      expect(result[0]).toHaveProperty('balance');
    });

    it('calculates balance correctly for each month', () => {
      const transactions: Transaction[] = [
        createTransaction({ date: new Date('2025-11-15'), type: 'income', amount: 1500 }),
        createTransaction({ date: new Date('2025-11-20'), type: 'expense', amount: 500 }),
      ];

      const result = calculateMonthlyData(transactions);
      // Find November 2025 in results
      const november = result.find(m => m.month.includes('Nov'));

      expect(november).toBeDefined();
      if (november) {
        expect(november.income).toBe(1500);
        expect(november.expenses).toBe(500);
        expect(november.balance).toBe(1000);
      }
    });

    it('returns zero values for months with no transactions', () => {
      const transactions: Transaction[] = [];

      const result = calculateMonthlyData(transactions);

      // All months should have zero values
      result.forEach(month => {
        expect(month.income).toBe(0);
        expect(month.expenses).toBe(0);
        expect(month.balance).toBe(0);
      });
    });

    it('filters transactions by month boundaries correctly', () => {
      const transactions: Transaction[] = [
        // Last day of October
        createTransaction({ date: new Date('2025-10-31'), type: 'income', amount: 1000 }),
        // First day of November
        createTransaction({ date: new Date('2025-11-01'), type: 'income', amount: 2000 }),
        // Last day of November
        createTransaction({ date: new Date('2025-11-30'), type: 'expense', amount: 500 }),
        // First day of December
        createTransaction({ date: new Date('2025-12-01'), type: 'expense', amount: 300 }),
      ];

      const result = calculateMonthlyData(transactions);
      
      const october = result.find(m => m.month.includes('Oct'));
      const november = result.find(m => m.month.includes('Nov'));

      expect(october).toBeDefined();
      expect(november).toBeDefined();
      
      if (october) {
        expect(october.income).toBe(1000);
        expect(october.expenses).toBe(0);
      }
      
      if (november) {
        expect(november.income).toBe(2000);
        expect(november.expenses).toBe(500);
      }
    });

    it('month format is human-readable', () => {
      const transactions: Transaction[] = [];
      const result = calculateMonthlyData(transactions);

      // Check that months are formatted like "Nov 2025", "Oct 2025", etc.
      result.forEach(month => {
        expect(month.month).toMatch(/^[A-Z][a-z]{2} \d{4}$/);
      });
    });
  });
});
