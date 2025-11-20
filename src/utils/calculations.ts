import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachMonthOfInterval, 
  eachDayOfInterval, 
  startOfDay, 
  subMonths, 
  differenceInDays 
} from 'date-fns';
import type { Locale } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Transaction, MonthlyData, CategorySummary } from '../types/Transaction';

/**
 * Calculate time-series income, expenses, and balance data
 * @param transactions - Transactions to aggregate
 * @param fromDate - Optional start date for the chart range
 * @param toDate - Optional end date for the chart range
 * @returns Array of data points (daily or monthly based on range)
 * 
 * Behavior:
 * - For date ranges ≤ 31 days: aggregates by DAY (fixes bug with single dots)
 * - For date ranges > 31 days: aggregates by MONTH
 * - If no date range provided: shows last 12 months (default behavior)
 * - See Bugs/FunctionalityTesting/bug2.md
 */
export const calculateMonthlyData = (
  transactions: Transaction[],
  fromDate?: Date | null,
  toDate?: Date | null,
  locale: Locale = enUS
): MonthlyData[] => {
  let startDate: Date;
  let endDate: Date;

  // Determine the date range for the chart
  if (fromDate && toDate) {
    // Use the provided date range
    startDate = startOfDay(fromDate);
    endDate = endOfDay(toDate);
  } else if (fromDate) {
    // Only fromDate provided - use it as start, end at today
    startDate = startOfDay(fromDate);
    endDate = endOfDay(new Date());
  } else if (toDate) {
    // Only toDate provided - go back 12 months from toDate
    startDate = subMonths(startOfMonth(toDate), 11);
    endDate = endOfDay(toDate);
  } else {
    // No date range - default to last 12 months
    const now = new Date();
    startDate = subMonths(now, 11);
    endDate = now;
  }

  // Decide between daily and monthly aggregation based on range
  const daysDifference = differenceInDays(endDate, startDate);
  const useDailyAggregation = daysDifference <= 31;

  if (useDailyAggregation) {
    // Daily aggregation for short ranges (≤ 31 days)
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayTransactions = transactions.filter(t => {
        const txDate = startOfDay(t.date);
        return txDate.getTime() === dayStart.getTime();
      });

      const income = dayTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const expenses = dayTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        month: format(day, 'MMM dd', { locale }), // "Nov 15" format for days
        income,
        expenses,
        balance: income - expenses
      };
    });
  } else {
    // Monthly aggregation for longer ranges (> 31 days)
    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthTransactions = transactions.filter(t => 
        t.date >= monthStart && t.date <= monthEnd
      );

      const income = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const expenses = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        month: format(month, 'MMM yyyy', { locale }), // "Nov 2025" format for months
        income,
        expenses,
        balance: income - expenses
      };
    });
  }
};

// Helper function to get end of day
function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export const calculateCategorySummary = (
  transactions: Transaction[], 
  type: 'income' | 'expense'
): CategorySummary[] => {
  const filteredTransactions = transactions.filter(t => t.type === type);
  const total = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);

  const categoryTotals = filteredTransactions.reduce((acc, transaction) => {
    if (!acc[transaction.category]) {
      acc[transaction.category] = 0;
    }
    acc[transaction.category] += transaction.amount;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      category,
      amount,
      color: getCategoryColor(category),
      percentage: total > 0 ? (amount / total) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount);
};

export const getTotalIncome = (transactions: Transaction[]): number => {
  return transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
};

export const getTotalExpenses = (transactions: Transaction[]): number => {
  return transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
};

export const getBalance = (transactions: Transaction[]): number => {
  return getTotalIncome(transactions) - getTotalExpenses(transactions);
};

/**
 * Filter transactions by date range
 * @param transactions - All transactions
 * @param fromDate - Start date (inclusive), null means no lower bound
 * @param toDate - End date (inclusive), null means no upper bound
 * @returns Filtered transactions within the date range
 */
export const getTransactionsInRange = (
  transactions: Transaction[],
  fromDate: Date | null,
  toDate: Date | null
): Transaction[] => {
  return transactions.filter(transaction => {
    if (fromDate && transaction.date < fromDate) {
      return false;
    }
    // Use endOfDay to make upper bound inclusive (include entire end date)
    if (toDate && transaction.date > endOfDay(toDate)) {
      return false;
    }
    return true;
  });
};

/**
 * Filter transactions by categories
 * @param transactions - All transactions
 * @param selectedCategories - Array of category names to include, empty array means all categories
 * @returns Filtered transactions matching selected categories
 */
export const filterTransactionsByCategories = (
  transactions: Transaction[],
  selectedCategories: string[]
): Transaction[] => {
  if (selectedCategories.length === 0) {
    return transactions;
  }
  return transactions.filter(t => selectedCategories.includes(t.category));
};

/**
 * Filter transactions by types
 * @param transactions - All transactions
 * @param selectedTypes - Array of types to include, empty array means all types
 * @returns Filtered transactions matching selected types
 */
export const filterTransactionsByTypes = (
  transactions: Transaction[],
  selectedTypes: ('income' | 'expense')[]
): Transaction[] => {
  if (selectedTypes.length === 0 || selectedTypes.length === 2) {
    return transactions;
  }
  return transactions.filter(t => selectedTypes.includes(t.type));
};

/**
 * Get average transaction amount
 * @param transactions - Transactions to calculate average from
 * @returns Average amount, 0 if no transactions
 */
export const getAverageTransaction = (transactions: Transaction[]): number => {
  if (transactions.length === 0) return 0;
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  return total / transactions.length;
};

const getCategoryColor = (category: string): string => {
  const colors = [
    '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', 
    '#F97316', '#22C55E', '#06B6D4', '#6B7280', '#EC4899'
  ];
  
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};
