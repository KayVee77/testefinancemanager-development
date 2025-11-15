import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dashboard } from './Dashboard';
import { Transaction } from '../types/Transaction';

// Mock the useTransactions hook
vi.mock('../hooks/useTransactions', () => ({
  useTransactions: vi.fn(),
}));

// Import after mocking to get the mocked version
import { useTransactions } from '../hooks/useTransactions';

// Helper to create test transactions
const createTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: '1',
  amount: 100,
  description: 'Test transaction',
  category: 'Test Category',
  type: 'expense',
  date: new Date('2025-11-15'),
  createdAt: new Date('2025-11-15'),
  ...overrides,
});

// Helper to create mock hook return value
const mockUseTransactions = (transactions: Transaction[]) => {
  vi.mocked(useTransactions).mockReturnValue({
    transactions,
    isLoading: false,
    error: null,
    add: vi.fn(),
    remove: vi.fn(),
    update: vi.fn(),
    refresh: vi.fn(),
  });
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all four stat cards', () => {
      mockUseTransactions([]);

      render(<Dashboard />);

      // Check all card titles are present
      expect(screen.getByText('Bendras balansas')).toBeInTheDocument();
      expect(screen.getByText('Bendros pajamos')).toBeInTheDocument();
      expect(screen.getByText('Bendros išlaidos')).toBeInTheDocument();
      expect(screen.getByText('Mėnesio balansas')).toBeInTheDocument();
    });

    it('displays zero values for empty transactions', () => {
      mockUseTransactions([]);

      render(<Dashboard />);

      // Should show €0.00 for all cards
      const zeroValues = screen.getAllByText('€0.00');
      // Balance, Income, Expenses, Monthly balance should all be 0
      expect(zeroValues.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Balance Calculations', () => {
    it('displays correct positive balance', () => {
      const transactions: Transaction[] = [
        createTransaction({ type: 'income', amount: 1500 }),
        createTransaction({ type: 'expense', amount: 500 }),
      ];

      mockUseTransactions(transactions);

      render(<Dashboard />);

      // Balance should be 1500 - 500 = 1000
      // Multiple elements may show this value
      expect(screen.getAllByText('€1000.00').length).toBeGreaterThan(0);
    });

    it('displays correct negative balance', () => {
      const transactions: Transaction[] = [
        createTransaction({ type: 'income', amount: 500 }),
        createTransaction({ type: 'expense', amount: 1500 }),
      ];

      mockUseTransactions(transactions);

      render(<Dashboard />);

      // Balance should be 500 - 1500 = -1000
      // Multiple elements may show this value
      expect(screen.getAllByText('€-1000.00').length).toBeGreaterThan(0);
    });

    it('applies green color class to positive balance', () => {
      const transactions: Transaction[] = [
        createTransaction({ type: 'income', amount: 1000 }),
      ];

      mockUseTransactions(transactions);

      render(<Dashboard />);

      // Find all elements with this value (both balance and monthly balance show it)
      const balanceElements = screen.getAllByText('€1000.00');
      // The first one should be the main balance card
      expect(balanceElements[0].className).toContain('text-green-600');
    });

    it('applies red color class to negative balance', () => {
      const transactions: Transaction[] = [
        createTransaction({ type: 'expense', amount: 500 }),
      ];

      mockUseTransactions(transactions);

      render(<Dashboard />);

      // Find all elements with this value
      const balanceElements = screen.getAllByText('€-500.00');
      // The first one should be the main balance card
      expect(balanceElements[0].className).toContain('text-red-600');
    });
  });

  describe('Income Calculations', () => {
    it('displays correct total income', () => {
      const transactions: Transaction[] = [
        createTransaction({ type: 'income', amount: 1000 }),
        createTransaction({ type: 'income', amount: 500 }),
        createTransaction({ type: 'expense', amount: 200 }),
      ];

      mockUseTransactions(transactions);

      render(<Dashboard />);

      // Total income should be 1500
      expect(screen.getByText('€1500.00')).toBeInTheDocument();
    });

    it('displays monthly income for current month', () => {
      // Create transactions for current month (November 2025)
      const currentMonthTransactions: Transaction[] = [
        createTransaction({ 
          type: 'income', 
          amount: 500, 
          date: new Date('2025-11-15') 
        }),
        createTransaction({ 
          type: 'income', 
          amount: 300, 
          date: new Date('2025-11-20') 
        }),
      ];

      // Add an old transaction that shouldn't be counted in monthly
      const allTransactions = [
        ...currentMonthTransactions,
        createTransaction({ 
          type: 'income', 
          amount: 1000, 
          date: new Date('2025-10-15') 
        }),
      ];

      mockUseTransactions(allTransactions);

      render(<Dashboard />);

      // Monthly income should be 800 (500 + 300, excluding October transaction)
      expect(screen.getByText(/Šį mėnesį: €800.00/)).toBeInTheDocument();
    });
  });

  describe('Expense Calculations', () => {
    it('displays correct total expenses', () => {
      const transactions: Transaction[] = [
        createTransaction({ type: 'expense', amount: 200 }),
        createTransaction({ type: 'expense', amount: 150 }),
        createTransaction({ type: 'income', amount: 1000 }),
      ];

      mockUseTransactions(transactions);

      render(<Dashboard />);

      // Total expenses should be 350
      expect(screen.getByText('€350.00')).toBeInTheDocument();
    });

    it('displays monthly expenses for current month', () => {
      const currentMonthTransactions: Transaction[] = [
        createTransaction({ 
          type: 'expense', 
          amount: 100, 
          date: new Date('2025-11-15') 
        }),
        createTransaction({ 
          type: 'expense', 
          amount: 50, 
          date: new Date('2025-11-20') 
        }),
      ];

      const allTransactions = [
        ...currentMonthTransactions,
        createTransaction({ 
          type: 'expense', 
          amount: 500, 
          date: new Date('2025-10-15') 
        }),
      ];

      mockUseTransactions(allTransactions);

      render(<Dashboard />);

      // Monthly expenses should be 150 (100 + 50)
      expect(screen.getByText(/Šį mėnesį: €150.00/)).toBeInTheDocument();
    });
  });

  describe('Monthly Balance', () => {
    it('calculates monthly balance correctly for positive balance', () => {
      const transactions: Transaction[] = [
        createTransaction({ 
          type: 'income', 
          amount: 1500, 
          date: new Date('2025-11-15') 
        }),
        createTransaction({ 
          type: 'expense', 
          amount: 500, 
          date: new Date('2025-11-20') 
        }),
      ];

      mockUseTransactions(transactions);

      render(<Dashboard />);

      // Monthly balance should be 1500 - 500 = 1000
      // Look for it in the last card
      const monthlyBalances = screen.getAllByText(/€1000.00/);
      expect(monthlyBalances.length).toBeGreaterThan(0);
    });

    it('calculates monthly balance correctly for negative balance', () => {
      const transactions: Transaction[] = [
        createTransaction({ 
          type: 'income', 
          amount: 300, 
          date: new Date('2025-11-15') 
        }),
        createTransaction({ 
          type: 'expense', 
          amount: 800, 
          date: new Date('2025-11-20') 
        }),
      ];

      mockUseTransactions(transactions);

      render(<Dashboard />);

      // Monthly balance should be 300 - 800 = -500
      // Both balance and monthly balance will show this value
      const balanceElements = screen.getAllByText('€-500.00');
      expect(balanceElements.length).toBeGreaterThan(0);
    });

    it('displays current month name', () => {
      mockUseTransactions([]);

      render(<Dashboard />);

      // Should display the current month (November 2025 or whatever the current date is)
      const monthText = new Date().toLocaleDateString('lt-LT', { 
        month: 'long', 
        year: 'numeric' 
      });
      
      expect(screen.getByText(monthText)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles decimal amounts correctly', () => {
      const transactions: Transaction[] = [
        createTransaction({ type: 'income', amount: 1500.50 }),
        createTransaction({ type: 'expense', amount: 250.25 }),
      ];

      mockUseTransactions(transactions);

      render(<Dashboard />);

      // Balance should be 1500.50 - 250.25 = 1250.25
      // Multiple elements may show the same value, just check they exist
      expect(screen.getAllByText('€1250.25').length).toBeGreaterThan(0);
      expect(screen.getByText('€1500.50')).toBeInTheDocument();
      expect(screen.getByText('€250.25')).toBeInTheDocument();
    });

    it('filters monthly transactions correctly by date boundaries', () => {
      // Get current month for testing
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth(); // 0-11
      
      const transactions: Transaction[] = [
        // Previous month - should NOT be counted
        createTransaction({ 
          type: 'income', 
          amount: 1000, 
          date: new Date(year, month - 1, 15) 
        }),
        // First day of current month - SHOULD be counted
        createTransaction({ 
          type: 'income', 
          amount: 500, 
          date: new Date(year, month, 1) 
        }),
        // Mid current month - SHOULD be counted
        createTransaction({ 
          type: 'expense', 
          amount: 200, 
          date: new Date(year, month, 15) 
        }),
        // Next month - should NOT be counted
        createTransaction({ 
          type: 'expense', 
          amount: 300, 
          date: new Date(year, month + 1, 1) 
        }),
      ];

      mockUseTransactions(transactions);

      render(<Dashboard />);

      // Monthly income should be 500 (only current month transaction)
      expect(screen.getByText(/Šį mėnesį: €500.00/)).toBeInTheDocument();
      // Monthly expenses should be 200 (only current month transaction)
      expect(screen.getByText(/Šį mėnesį: €200.00/)).toBeInTheDocument();
    });
  });
});
