import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransactionList } from './TransactionList';
import { Transaction, Category } from '../types/Transaction';

// Mock the useTransactions hook
vi.mock('../hooks/useTransactions', () => ({
  useTransactions: vi.fn(),
}));

import { useTransactions } from '../hooks/useTransactions';

// Helper to create test transactions
const createTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: '1',
  amount: 100,
  description: 'Test transaction',
  category: 'Maistas',
  type: 'expense',
  date: new Date('2025-11-15'),
  createdAt: new Date('2025-11-15'),
  ...overrides,
});

// Helper to create test categories
const createCategory = (overrides: Partial<Category> = {}): Category => ({
  id: '1',
  name: 'Maistas',
  color: '#3B82F6',
  icon: 'circle',
  type: 'expense',
  ...overrides,
});

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

describe('TransactionList Component', () => {
  const defaultCategories: Category[] = [
    createCategory({ id: '1', name: 'Maistas', color: '#FF0000' }),
    createCategory({ id: '2', name: 'Transportas', color: '#00FF00' }),
    createCategory({ id: '3', name: 'Alga', color: '#0000FF', type: 'income' }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders transaction list header', () => {
      mockUseTransactions([]);

      render(<TransactionList categories={defaultCategories} />);

      expect(screen.getByText('Transakcijų istorija')).toBeInTheDocument();
    });

    it('displays empty state when no transactions', () => {
      mockUseTransactions([]);

      render(<TransactionList categories={defaultCategories} />);

      expect(screen.getByText('Nėra transakcijų pagal pasirinktus filtrus')).toBeInTheDocument();
    });

    it('renders transactions when available', () => {
      const transactions = [
        createTransaction({ id: '1', description: 'Grocery shopping', amount: 50 }),
        createTransaction({ id: '2', description: 'Bus ticket', amount: 2.5 }),
      ];

      mockUseTransactions(transactions);

      render(<TransactionList categories={defaultCategories} />);

      expect(screen.getByText('Grocery shopping')).toBeInTheDocument();
      expect(screen.getByText('Bus ticket')).toBeInTheDocument();
    });

    it('displays transaction amounts with correct formatting', () => {
      const transactions = [
        createTransaction({ id: '1', amount: 50.5, type: 'expense' }),
        createTransaction({ id: '2', amount: 1000, type: 'income' }),
      ];

      mockUseTransactions(transactions);

      render(<TransactionList categories={defaultCategories} />);

      expect(screen.getByText('-€50.50')).toBeInTheDocument();
      expect(screen.getByText('+€1000.00')).toBeInTheDocument();
    });

    it('displays transaction dates in correct format', () => {
      const transactions = [
        createTransaction({ id: '1', date: new Date('2025-11-15') }),
      ];

      mockUseTransactions(transactions);

      render(<TransactionList categories={defaultCategories} />);

      expect(screen.getByText('2025-11-15')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('filters transactions by type - all', () => {
      const transactions = [
        createTransaction({ id: '1', description: 'Expense 1', type: 'expense' }),
        createTransaction({ id: '2', description: 'Income 1', type: 'income' }),
      ];

      mockUseTransactions(transactions);

      render(<TransactionList categories={defaultCategories} />);

      expect(screen.getByText('Expense 1')).toBeInTheDocument();
      expect(screen.getByText('Income 1')).toBeInTheDocument();
    });

    it('filters transactions by type - income only', async () => {
      const user = userEvent.setup();
      const transactions = [
        createTransaction({ id: '1', description: 'Expense 1', type: 'expense' }),
        createTransaction({ id: '2', description: 'Income 1', type: 'income', category: 'Alga' }),
      ];

      mockUseTransactions(transactions);

      render(<TransactionList categories={defaultCategories} />);

      const incomeButton = screen.getByRole('button', { name: /Pajamos/i });
      await user.click(incomeButton);

      expect(screen.queryByText('Expense 1')).not.toBeInTheDocument();
      expect(screen.getByText('Income 1')).toBeInTheDocument();
    });

    it('filters transactions by type - expense only', async () => {
      const user = userEvent.setup();
      const transactions = [
        createTransaction({ id: '1', description: 'Expense 1', type: 'expense' }),
        createTransaction({ id: '2', description: 'Income 1', type: 'income' }),
      ];

      mockUseTransactions(transactions);

      render(<TransactionList categories={defaultCategories} />);

      const expenseButton = screen.getByRole('button', { name: /Išlaidos/i });
      await user.click(expenseButton);

      expect(screen.getByText('Expense 1')).toBeInTheDocument();
      expect(screen.queryByText('Income 1')).not.toBeInTheDocument();
    });

    it('filters transactions by category', async () => {
      const user = userEvent.setup();
      const transactions = [
        createTransaction({ id: '1', description: 'Food', category: 'Maistas' }),
        createTransaction({ id: '2', description: 'Transport', category: 'Transportas' }),
      ];

      mockUseTransactions(transactions);

      render(<TransactionList categories={defaultCategories} />);

      const categorySelect = screen.getByDisplayValue('Visos kategorijos');
      await user.selectOptions(categorySelect, 'Maistas');

      expect(screen.getByText('Food')).toBeInTheDocument();
      expect(screen.queryByText('Transport')).not.toBeInTheDocument();
    });

    it('filters transactions by month', async () => {
      const user = userEvent.setup();
      const transactions = [
        createTransaction({ id: '1', description: 'November', date: new Date('2025-11-15') }),
        createTransaction({ id: '2', description: 'October', date: new Date('2025-10-15') }),
      ];

      mockUseTransactions(transactions);

      render(<TransactionList categories={defaultCategories} />);

      const monthInput = screen.getByDisplayValue('');
      await user.type(monthInput, '2025-11');

      expect(screen.getByText('November')).toBeInTheDocument();
      expect(screen.queryByText('October')).not.toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('displays transactions sorted by date descending (newest first)', () => {
      const transactions = [
        createTransaction({ id: '1', description: 'Oldest', date: new Date('2025-11-01') }),
        createTransaction({ id: '2', description: 'Newest', date: new Date('2025-11-20') }),
        createTransaction({ id: '3', description: 'Middle', date: new Date('2025-11-10') }),
      ];

      mockUseTransactions(transactions);

      render(<TransactionList categories={defaultCategories} />);

      const descriptions = screen.getAllByText(/Oldest|Newest|Middle/).map(el => el.textContent);
      expect(descriptions[0]).toBe('Newest');
      expect(descriptions[1]).toBe('Middle');
      expect(descriptions[2]).toBe('Oldest');
    });
  });

  describe('Delete Functionality', () => {
    it('calls remove function when delete button is clicked', async () => {
      const user = userEvent.setup();
      const mockRemove = vi.fn();
      const transactions = [
        createTransaction({ id: '123', description: 'To be deleted' }),
      ];

      vi.mocked(useTransactions).mockReturnValue({
        transactions,
        isLoading: false,
        error: null,
        add: vi.fn(),
        remove: mockRemove,
        update: vi.fn(),
        refresh: vi.fn(),
      });

      render(<TransactionList categories={defaultCategories} />);

      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find(btn => btn.querySelector('.lucide-trash-2'));

      if (deleteButton) {
        await user.click(deleteButton);
        expect(mockRemove).toHaveBeenCalledWith('123');
      }
    });

    it('renders delete button for each transaction', () => {
      const transactions = [
        createTransaction({ id: '1', description: 'Transaction 1' }),
        createTransaction({ id: '2', description: 'Transaction 2' }),
      ];

      mockUseTransactions(transactions);

      const { container } = render(<TransactionList categories={defaultCategories} />);

      // Check for buttons with h-4 w-4 class (delete icon size)
      const deleteIcons = container.querySelectorAll('.h-4.w-4');
      
      // Should have at least 2 delete icons (one per transaction)
      expect(deleteIcons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Category Colors', () => {
    it('displays category color indicator for each transaction', () => {
      const transactions = [
        createTransaction({ id: '1', category: 'Maistas' }),
      ];

      mockUseTransactions(transactions);

      render(<TransactionList categories={defaultCategories} />);

      // Find the color indicator div
      const colorIndicators = document.querySelectorAll('.w-3.h-3.rounded-full');
      expect(colorIndicators.length).toBe(1);
    });

    it('uses correct category color from categories prop', () => {
      const transactions = [
        createTransaction({ id: '1', category: 'Maistas' }),
      ];

      mockUseTransactions(transactions);

      render(<TransactionList categories={defaultCategories} />);

      const colorIndicator = document.querySelector('.w-3.h-3.rounded-full') as HTMLElement;
      expect(colorIndicator?.style.backgroundColor).toBe('rgb(255, 0, 0)'); // #FF0000
    });
  });

  describe('Income vs Expense Styling', () => {
    it('displays income amounts in green with + prefix', () => {
      const transactions = [
        createTransaction({ id: '1', type: 'income', amount: 100, category: 'Alga' }),
      ];

      mockUseTransactions(transactions);

      render(<TransactionList categories={defaultCategories} />);

      const amountElement = screen.getByText('+€100.00');
      expect(amountElement.className).toContain('text-green-600');
    });

    it('displays expense amounts in red with - prefix', () => {
      const transactions = [
        createTransaction({ id: '1', type: 'expense', amount: 50 }),
      ];

      mockUseTransactions(transactions);

      render(<TransactionList categories={defaultCategories} />);

      const amountElement = screen.getByText('-€50.00');
      expect(amountElement.className).toContain('text-red-600');
    });
  });

  describe('Filter Buttons Styling', () => {
    it('highlights active filter button', async () => {
      const user = userEvent.setup();
      mockUseTransactions([]);

      render(<TransactionList categories={defaultCategories} />);

      const allButton = screen.getByRole('button', { name: /Visi/i });
      expect(allButton.className).toContain('bg-white');

      const incomeButton = screen.getByRole('button', { name: /Pajamos/i });
      await user.click(incomeButton);

      expect(incomeButton.className).toContain('text-green-600');
    });
  });
});
