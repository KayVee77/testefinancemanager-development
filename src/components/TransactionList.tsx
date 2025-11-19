import React, { useState } from 'react';
import { Category } from '../types/Transaction';
import { useTransactions } from '../hooks/useTransactions';
import { useTranslation } from '../hooks/useTranslation';
import { translateCategoryName } from '../i18n';
import { Trash2, Calendar, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { ImportExportToolbar } from './ImportExport/ImportExportToolbar';

interface TransactionListProps {
  categories: Category[];
  onEdit: (transaction: import('../types/Transaction').Transaction) => void;
}

/**
 * TransactionList Component - Transaction History Table
 * 
 * ✨ REFACTORED in Phase 2.1:
 * - Removed transactions prop (was prop drilling from App.tsx)
 * - Removed onDeleteTransaction prop (was callback drilling)
 * - Uses useTransactions() hook for data and operations
 * - Delete operation now handled internally via hook
 */
export const TransactionList: React.FC<TransactionListProps> = ({ categories, onEdit }) => {
  const { transactions, remove: deleteTransaction } = useTransactions();
  const { t, language } = useTranslation();
  
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  const filteredTransactions = transactions
    .filter(t => filter === 'all' || t.type === filter)
    .filter(t => categoryFilter === 'all' || t.category === categoryFilter)
    .filter(t => !dateFilter || format(t.date, 'yyyy-MM') === dateFilter)
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const getCategoryColor = (categoryName: string) => {
    const category = categories.find(cat => cat.name === categoryName);
    return category?.color || '#6B7280';
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTransaction(id);
    } catch (error) {
      // Error already handled by hook (notification shown)
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700">
        <div className="flex flex-col gap-4">
          {/* Header Row: Title + Import/Export Toolbar */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('transactions.history')}</h3>
            <ImportExportToolbar transactions={filteredTransactions} />
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap gap-3">
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-sm rounded-md transition-all ${
                  filter === 'all' ? 'bg-white dark:bg-gray-800 shadow-sm dark:text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-600 dark:text-gray-300'
                }`}
              >
                {t('transactions.filterAll')}
              </button>
              <button
                onClick={() => setFilter('income')}
                className={`px-3 py-1 text-sm rounded-md transition-all ${
                  filter === 'income' ? 'bg-white dark:bg-gray-800 shadow-sm text-green-600 dark:text-green-400' : 'hover:bg-gray-200 dark:hover:bg-gray-600 dark:text-gray-300'
                }`}
              >
                {t('transactions.filterIncome')}
              </button>
              <button
                onClick={() => setFilter('expense')}
                className={`px-3 py-1 text-sm rounded-md transition-all ${
                  filter === 'expense' ? 'bg-white dark:bg-gray-800 shadow-sm text-red-600 dark:text-red-400' : 'hover:bg-gray-200 dark:hover:bg-gray-600 dark:text-gray-300'
                }`}
              >
                {t('transactions.filterExpense')}
              </button>
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{t('transactions.allCategories')}</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{translateCategoryName(cat.name, language)}</option>
              ))}
            </select>

            <input
              type="month"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p>{t('transactions.noTransactions')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredTransactions.map((transaction) => (
              <div key={transaction.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getCategoryColor(transaction.category) }}
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{transaction.description}</p>
                      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>{translateCategoryName(transaction.category, language)}</span>
                        <span>•</span>
                        <span>{format(transaction.date, 'yyyy-MM-dd')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span
                      className={`font-semibold ${
                        transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '-'}€{transaction.amount.toFixed(2)}
                    </span>
                    <button
                      onClick={() => onEdit(transaction)}
                      className="p-1 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                      title={t('common.edit')}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(transaction.id)}
                      className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                      title={t('common.delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};