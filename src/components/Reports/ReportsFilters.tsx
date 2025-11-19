import React from 'react';
import { useReportFilters } from '../../stores/reportFiltersStore';
import { useTransactions } from '../../hooks/useTransactions';
import { useTranslation } from '../../hooks/useTranslation';
import { translateCategoryName } from '../../i18n';
import { Filter, X, Calendar } from 'lucide-react';
import { format } from 'date-fns';

/**
 * ReportsFilters Component
 * 
 * Comprehensive filtering UI for Reports section with:
 * - Quick filter presets (last 7/30 days, this month, last month, this year)
 * - Custom date range picker (from/to)
 * - Category multi-select (derived from all transactions)
 * - Type toggles (income/expense)
 * - Active filters badge with count
 * - Clear filters button
 * 
 * Architecture:
 * - Uses Zustand store (reportFiltersStore) for state persistence
 * - Derives unique categories from transactions dynamically (no separate category store)
 * - Full i18n support with Lithuanian/English translations
 * - Responsive layout with Tailwind CSS
 */
export const ReportsFilters: React.FC = () => {
  const { filters, setFromDate, setToDate, toggleCategory, toggleType, resetFilters, applyQuickFilter, hasActiveFilters } = useReportFilters();
  const { transactions } = useTransactions();
  const { t, language } = useTranslation();

  // Extract unique categories from all transactions (both income and expense)
  const uniqueCategories = React.useMemo(() => {
    const categorySet = new Set<string>();
    transactions.forEach(t => categorySet.add(t.category));
    return Array.from(categorySet).sort();
  }, [transactions]);

  // Format date for input[type="date"]
  const formatDateForInput = (date: Date | null): string => {
    if (!date) return '';
    return format(date, 'yyyy-MM-dd');
  };

  // Parse date from input[type="date"]
  const parseDateFromInput = (dateString: string): Date | null => {
    if (!dateString) return null;
    return new Date(dateString);
  };

  // Quick filter buttons
  const quickFilters: Array<{ key: string; label: string }> = [
    { key: 'last7days', label: t('reports.filters.last7days') },
    { key: 'last30days', label: t('reports.filters.last30days') },
    { key: 'thisMonth', label: t('reports.filters.thisMonth') },
    { key: 'lastMonth', label: t('reports.filters.lastMonth') },
    { key: 'thisYear', label: t('reports.filters.thisYear') },
  ];

  // Count active filters
  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (filters.fromDate || filters.toDate) count++;
    if (filters.selectedCategories.length > 0 && filters.selectedCategories.length < uniqueCategories.length) count++;
    if (filters.selectedTypes.length < 2) count++; // Less than both types selected
    return count;
  }, [filters, uniqueCategories.length]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Filter className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('reports.filters.title')}
          </h3>
          {activeFilterCount > 0 && (
            <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
              {activeFilterCount} {t('reports.filters.activeFilters')}
            </span>
          )}
        </div>
        {hasActiveFilters() && (
          <button
            onClick={resetFilters}
            className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
            <span>{t('reports.filters.clear')}</span>
          </button>
        )}
      </div>

      {/* Quick Filters */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {t('reports.filters.quickFilters')}
        </label>
        <div className="flex flex-wrap gap-2">
          {quickFilters.map(qf => (
            <button
              key={qf.key}
              onClick={() => applyQuickFilter(qf.key as any)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-300 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors"
            >
              {qf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          <Calendar className="inline h-4 w-4 mr-1" />
          {t('reports.filters.dateRange')}
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              {t('reports.filters.dateFrom')}
            </label>
            <input
              type="date"
              value={formatDateForInput(filters.fromDate)}
              onChange={(e) => setFromDate(parseDateFromInput(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              {t('reports.filters.dateTo')}
            </label>
            <input
              type="date"
              value={formatDateForInput(filters.toDate)}
              onChange={(e) => setToDate(parseDateFromInput(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Type Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {t('reports.filters.typeLabel')}
        </label>
        <div className="flex gap-3">
          <button
            onClick={() => toggleType('income')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
              filters.selectedTypes.includes('income')
                ? 'bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700'
                : 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 opacity-50'
            }`}
          >
            {t('transactions.typeIncome')}
          </button>
          <button
            onClick={() => toggleType('expense')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
              filters.selectedTypes.includes('expense')
                ? 'bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700'
                : 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 opacity-50'
            }`}
          >
            {t('transactions.typeExpense')}
          </button>
        </div>
      </div>

      {/* Category Filter */}
      {uniqueCategories.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('reports.filters.categoryLabel')}
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
              ({filters.selectedCategories.length === 0 ? t('reports.filters.allCategories') : `${filters.selectedCategories.length} ${t('common.selected')}`})
            </span>
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            {uniqueCategories.map(category => {
              const isSelected = filters.selectedCategories.includes(category);
              return (
                <label
                  key={category}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-900 border-blue-300 dark:border-blue-700 border'
                      : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 border hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleCategory(category)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-900 dark:text-white truncate">
                    {translateCategoryName(category, language)}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {uniqueCategories.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="text-sm">{t('reports.noTransactions')}</p>
          <p className="text-xs mt-1">{t('reports.addFirstTransaction')}</p>
        </div>
      )}
    </div>
  );
};
