import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../utils/test-utils';
import userEvent from '@testing-library/user-event';
import { TransactionForm } from './TransactionForm';
import { Category } from '../types/Transaction';

// Helper to create test categories
const createCategory = (overrides: Partial<Category> = {}): Category => ({
  id: '1',
  name: 'Test Category',
  color: '#3B82F6',
  icon: 'circle',
  type: 'expense',
  ...overrides,
});

describe('TransactionForm Component', () => {
  const mockOnAddTransaction = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnAddCategory = vi.fn();

  const defaultCategories: Category[] = [
    createCategory({ id: '1', name: 'Maistas', type: 'expense' }),
    createCategory({ id: '2', name: 'Transportas', type: 'expense' }),
    createCategory({ id: '3', name: 'Alga', type: 'income' }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders form when isOpen is true', () => {
      render(
        <TransactionForm
          categories={defaultCategories}
          onAddTransaction={mockOnAddTransaction}
          isOpen={true}
          onClose={mockOnClose}
          onAddCategory={mockOnAddCategory}
        />
      );

      expect(screen.getByText('Pridėti transakciją')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Transakcijos aprašymas')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(
        <TransactionForm
          categories={defaultCategories}
          onAddTransaction={mockOnAddTransaction}
          isOpen={false}
          onClose={mockOnClose}
          onAddCategory={mockOnAddCategory}
        />
      );

      expect(screen.queryByText('Pridėti transakciją')).not.toBeInTheDocument();
    });

    it('renders with expense type selected by default', () => {
      render(
        <TransactionForm
          categories={defaultCategories}
          onAddTransaction={mockOnAddTransaction}
          isOpen={true}
          onClose={mockOnClose}
          onAddCategory={mockOnAddCategory}
        />
      );

      const expenseButton = screen.getByRole('button', { name: /Išlaidos/i });
      expect(expenseButton.className).toContain('text-red-600');
    });
  });

  describe('Form Interactions', () => {
    it('allows user to fill in all fields', async () => {
      const user = userEvent.setup();

      render(
        <TransactionForm
          categories={defaultCategories}
          onAddTransaction={mockOnAddTransaction}
          isOpen={true}
          onClose={mockOnClose}
          onAddCategory={mockOnAddCategory}
        />
      );

      const amountInput = screen.getByPlaceholderText('0.00');
      const descriptionInput = screen.getByPlaceholderText('Transakcijos aprašymas');
      const categorySelect = screen.getByRole('combobox');

      await user.type(amountInput, '50.00');
      await user.type(descriptionInput, 'Test expense');
      await user.selectOptions(categorySelect, 'Maistas');

      expect(amountInput).toHaveValue(50);
      expect(descriptionInput).toHaveValue('Test expense');
      expect(categorySelect).toHaveValue('Maistas');
    });

    it('switches between expense and income types', async () => {
      const user = userEvent.setup();

      render(
        <TransactionForm
          categories={defaultCategories}
          onAddTransaction={mockOnAddTransaction}
          isOpen={true}
          onClose={mockOnClose}
          onAddCategory={mockOnAddCategory}
        />
      );

      const incomeButton = screen.getByRole('button', { name: /Pajamos/i });
      await user.click(incomeButton);

      expect(incomeButton.className).toContain('text-green-600');

      // Should now show income categories
      const categorySelect = screen.getByRole('combobox');
      expect(screen.getByText('Alga')).toBeInTheDocument();
    });

    it('filters categories by selected type', async () => {
      const user = userEvent.setup();

      render(
        <TransactionForm
          categories={defaultCategories}
          onAddTransaction={mockOnAddTransaction}
          isOpen={true}
          onClose={mockOnClose}
          onAddCategory={mockOnAddCategory}
        />
      );

      // Initially expense type - should show expense categories
      expect(screen.getByText('Maistas')).toBeInTheDocument();
      expect(screen.getByText('Transportas')).toBeInTheDocument();

      // Switch to income
      const incomeButton = screen.getByRole('button', { name: /Pajamos/i });
      await user.click(incomeButton);

      // Should now show only income categories
      expect(screen.getByText('Alga')).toBeInTheDocument();
      expect(screen.queryByText('Maistas')).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('submits form with valid data', async () => {
      const user = userEvent.setup();

      render(
        <TransactionForm
          categories={defaultCategories}
          onAddTransaction={mockOnAddTransaction}
          isOpen={true}
          onClose={mockOnClose}
          onAddCategory={mockOnAddCategory}
        />
      );

      await user.type(screen.getByPlaceholderText('0.00'), '75.50');
      await user.type(screen.getByPlaceholderText('Transakcijos aprašymas'), 'Grocery shopping');
      await user.selectOptions(screen.getByRole('combobox'), 'Maistas');

      const submitButton = screen.getByRole('button', { name: /Pridėti$/i });
      await user.click(submitButton);

      expect(mockOnAddTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 75.50,
          description: 'Grocery shopping',
          category: 'Maistas',
          type: 'expense',
          date: expect.any(Date),
        })
      );
    });

    it('closes form after successful submission', async () => {
      const user = userEvent.setup();

      render(
        <TransactionForm
          categories={defaultCategories}
          onAddTransaction={mockOnAddTransaction}
          isOpen={true}
          onClose={mockOnClose}
          onAddCategory={mockOnAddCategory}
        />
      );

      await user.type(screen.getByPlaceholderText('0.00'), '50.00');
      await user.type(screen.getByPlaceholderText('Transakcijos aprašymas'), 'Test');
      await user.selectOptions(screen.getByRole('combobox'), 'Maistas');

      const submitButton = screen.getByRole('button', { name: /Pridėti$/i });
      await user.click(submitButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('resets form fields after submission', async () => {
      const user = userEvent.setup();

      render(
        <TransactionForm
          categories={defaultCategories}
          onAddTransaction={mockOnAddTransaction}
          isOpen={true}
          onClose={mockOnClose}
          onAddCategory={mockOnAddCategory}
        />
      );

      const amountInput = screen.getByPlaceholderText('0.00');
      const descriptionInput = screen.getByPlaceholderText('Transakcijos aprašymas');

      await user.type(amountInput, '100.00');
      await user.type(descriptionInput, 'Test transaction');
      await user.selectOptions(screen.getByRole('combobox'), 'Maistas');

      const submitButton = screen.getByRole('button', { name: /Pridėti$/i });
      await user.click(submitButton);

      // Form should be reset
      expect(amountInput).toHaveValue(null);
      expect(descriptionInput).toHaveValue('');
    });

    it('sanitizes description input before submission', async () => {
      const user = userEvent.setup();

      render(
        <TransactionForm
          categories={defaultCategories}
          onAddTransaction={mockOnAddTransaction}
          isOpen={true}
          onClose={mockOnClose}
          onAddCategory={mockOnAddCategory}
        />
      );

      await user.type(screen.getByPlaceholderText('0.00'), '50.00');
      await user.type(screen.getByPlaceholderText('Transakcijos aprašymas'), '  Trimmed text  ');
      await user.selectOptions(screen.getByRole('combobox'), 'Maistas');

      const submitButton = screen.getByRole('button', { name: /Pridėti$/i });
      await user.click(submitButton);

      expect(mockOnAddTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Trimmed text',
        })
      );
    });
  });

  describe('Validation', () => {
    it('requires amount field', async () => {
      const user = userEvent.setup();

      render(
        <TransactionForm
          categories={defaultCategories}
          onAddTransaction={mockOnAddTransaction}
          isOpen={true}
          onClose={mockOnClose}
          onAddCategory={mockOnAddCategory}
        />
      );

      // Try to submit without amount
      await user.type(screen.getByPlaceholderText('Transakcijos aprašymas'), 'Test');
      await user.selectOptions(screen.getByRole('combobox'), 'Maistas');

      const submitButton = screen.getByRole('button', { name: /Pridėti$/i });
      await user.click(submitButton);

      // Form should not be submitted
      expect(mockOnAddTransaction).not.toHaveBeenCalled();
    });

    it('requires description field', async () => {
      const user = userEvent.setup();

      render(
        <TransactionForm
          categories={defaultCategories}
          onAddTransaction={mockOnAddTransaction}
          isOpen={true}
          onClose={mockOnClose}
          onAddCategory={mockOnAddCategory}
        />
      );

      // Try to submit without description
      await user.type(screen.getByPlaceholderText('0.00'), '50.00');
      await user.selectOptions(screen.getByRole('combobox'), 'Maistas');

      const submitButton = screen.getByRole('button', { name: /Pridėti$/i });
      await user.click(submitButton);

      // Form should not be submitted
      expect(mockOnAddTransaction).not.toHaveBeenCalled();
    });

    it('requires category selection', async () => {
      const user = userEvent.setup();

      render(
        <TransactionForm
          categories={defaultCategories}
          onAddTransaction={mockOnAddTransaction}
          isOpen={true}
          onClose={mockOnClose}
          onAddCategory={mockOnAddCategory}
        />
      );

      // Try to submit without category
      await user.type(screen.getByPlaceholderText('0.00'), '50.00');
      await user.type(screen.getByPlaceholderText('Transakcijos aprašymas'), 'Test');

      const submitButton = screen.getByRole('button', { name: /Pridėti$/i });
      await user.click(submitButton);

      // Form should not be submitted
      expect(mockOnAddTransaction).not.toHaveBeenCalled();
    });
  });

  describe('Category Management', () => {
    it('shows new category form when clicking "Nauja" button', async () => {
      const user = userEvent.setup();

      render(
        <TransactionForm
          categories={defaultCategories}
          onAddTransaction={mockOnAddTransaction}
          isOpen={true}
          onClose={mockOnClose}
          onAddCategory={mockOnAddCategory}
        />
      );

      const newCategoryButton = screen.getByRole('button', { name: /Nauja/i });
      await user.click(newCategoryButton);

      expect(screen.getByPlaceholderText('Kategorijos pavadinimas')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Pridėti kategoriją/i })).toBeInTheDocument();
    });

    it('allows adding a new category', async () => {
      const user = userEvent.setup();

      render(
        <TransactionForm
          categories={defaultCategories}
          onAddTransaction={mockOnAddTransaction}
          isOpen={true}
          onClose={mockOnClose}
          onAddCategory={mockOnAddCategory}
        />
      );

      // Open new category form
      const newCategoryButton = screen.getByRole('button', { name: /Nauja/i });
      await user.click(newCategoryButton);

      // Fill in new category details
      const categoryNameInput = screen.getByPlaceholderText('Kategorijos pavadinimas');
      await user.type(categoryNameInput, 'Pramogos');

      // Click add category button
      const addCategoryButton = screen.getByRole('button', { name: /Pridėti kategoriją/i });
      await user.click(addCategoryButton);

      expect(mockOnAddCategory).toHaveBeenCalledWith({
        name: 'Pramogos',
        color: '#3B82F6',
        icon: 'circle',
        type: 'expense',
      });
    });

    it('closes new category form after adding category', async () => {
      const user = userEvent.setup();

      render(
        <TransactionForm
          categories={defaultCategories}
          onAddTransaction={mockOnAddTransaction}
          isOpen={true}
          onClose={mockOnClose}
          onAddCategory={mockOnAddCategory}
        />
      );

      // Open and fill new category form
      await user.click(screen.getByRole('button', { name: /Nauja/i }));
      await user.type(screen.getByPlaceholderText('Kategorijos pavadinimas'), 'Test');
      await user.click(screen.getByRole('button', { name: /Pridėti kategoriją/i }));

      // New category form should be hidden
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Kategorijos pavadinimas')).not.toBeInTheDocument();
      });
    });
  });

  describe('Close Functionality', () => {
    it('calls onClose when clicking X button', async () => {
      const user = userEvent.setup();

      render(
        <TransactionForm
          categories={defaultCategories}
          onAddTransaction={mockOnAddTransaction}
          isOpen={true}
          onClose={mockOnClose}
          onAddCategory={mockOnAddCategory}
        />
      );

      // Find the X button by its parent structure
      const closeButtons = screen.getAllByRole('button');
      const xButton = closeButtons.find(button => button.querySelector('.lucide-x'));
      
      if (xButton) {
        await user.click(xButton);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('calls onClose when clicking cancel button', async () => {
      const user = userEvent.setup();

      render(
        <TransactionForm
          categories={defaultCategories}
          onAddTransaction={mockOnAddTransaction}
          isOpen={true}
          onClose={mockOnClose}
          onAddCategory={mockOnAddCategory}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /Atšaukti/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
