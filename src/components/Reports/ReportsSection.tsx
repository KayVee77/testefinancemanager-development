import React from 'react';
import { useReportFilters } from '../../stores/reportFiltersStore';
import { useTransactions } from '../../hooks/useTransactions';
import { useTranslation } from '../../hooks/useTranslation';
import { useLanguage } from '../../contexts/LanguageContext';
import { Charts } from '../Charts';
import { ReportsFilters } from './ReportsFilters';
import { 
  getTransactionsInRange, 
  filterTransactionsByCategories, 
  filterTransactionsByTypes, 
  getTotalIncome, 
  getTotalExpenses, 
  getBalance,
  getAverageTransaction 
} from '../../utils/calculations';
import { generateCSV, downloadCSV } from '../../utils/csv/generator';
import { TrendingUp, TrendingDown, Wallet, Hash, Calculator, Download, AlertCircle } from 'lucide-react';

/**
 * ReportsSection Component
 * 
 * Comprehensive analytics dashboard with:
 * - ReportsFilters component for date/category/type filtering
 * - 5 KPI cards showing key financial metrics from filtered data
 * - Charts component receiving filtered transactions
 * - Export filtered data to CSV
 * - Empty state handling with helpful messages
 * 
 * Architecture:
 * - Connects to reportFiltersStore via useReportFilters hook
 * - Applies filtering pipeline: transactions → date filter → category filter → type filter
 * - Uses useMemo for performance optimization
 * - Full i18n support
 * - Responsive grid layout with Tailwind CSS
 */
export const ReportsSection: React.FC = () => {
  const { filters } = useReportFilters();
  const { transactions: allTransactions } = useTransactions();
  const { t } = useTranslation();
  const { language } = useLanguage();

  // Apply filtering pipeline with useMemo for performance
  const filteredTransactions = React.useMemo(() => {
    let result = allTransactions;

    // Step 1: Apply date range filter
    if (filters.fromDate || filters.toDate) {
      result = getTransactionsInRange(result, filters.fromDate, filters.toDate);
    }

    // Step 2: Apply category filter
    if (filters.selectedCategories.length > 0) {
      result = filterTransactionsByCategories(result, filters.selectedCategories);
    }

    // Step 3: Apply type filter
    if (filters.selectedTypes.length > 0 && filters.selectedTypes.length < 2) {
      result = filterTransactionsByTypes(result, filters.selectedTypes);
    }

    return result;
  }, [allTransactions, filters]);

  // For Charts component: filter by date and category only, NOT by type
  // Charts component handles type filtering internally for line chart only
  const chartTransactions = React.useMemo(() => {
    let result = allTransactions;

    // Step 1: Apply date range filter
    if (filters.fromDate || filters.toDate) {
      result = getTransactionsInRange(result, filters.fromDate, filters.toDate);
    }

    // Step 2: Apply category filter
    if (filters.selectedCategories.length > 0) {
      result = filterTransactionsByCategories(result, filters.selectedCategories);
    }

    // NOTE: DO NOT apply type filter - pie charts must remain independent

    return result;
  }, [allTransactions, filters.fromDate, filters.toDate, filters.selectedCategories]);

  // Calculate KPIs from filtered transactions
  const totalIncome = getTotalIncome(filteredTransactions);
  const totalExpenses = getTotalExpenses(filteredTransactions);
  const balance = getBalance(filteredTransactions);
  const transactionCount = filteredTransactions.length;
  const avgTransaction = getAverageTransaction(filteredTransactions);

  // Handle CSV export of filtered data
  const handleExportFiltered = () => {
    if (filteredTransactions.length === 0) {
      return;
    }
    
    const csvContent = generateCSV(filteredTransactions, language);
    downloadCSV(csvContent, `filtered-transactions-${Date.now()}.csv`);
  };

  // Check if there are no transactions at all
  const hasNoTransactions = allTransactions.length === 0;

  // Check if filters are active but returned no results
  const hasActiveFiltersWithNoResults = 
    !hasNoTransactions && 
    filteredTransactions.length === 0 && 
    (filters.fromDate !== null || 
     filters.toDate !== null || 
     filters.selectedCategories.length > 0 || 
     filters.selectedTypes.length < 2);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('reports.title')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('reports.subtitle')}
          </p>
        </div>
        
        {/* Export Filtered Data Button */}
        {filteredTransactions.length > 0 && (
          <button
            onClick={handleExportFiltered}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
          >
            <Download className="h-4 w-4" />
            <span>{t('reports.filters.exportFiltered')}</span>
          </button>
        )}
      </div>

      {/* Filters Panel */}
      <ReportsFilters />

      {/* Empty State: No Transactions */}
      {hasNoTransactions && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('reports.noTransactions')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('reports.addFirstTransaction')}
          </p>
        </div>
      )}

      {/* Empty State: Active Filters with No Results */}
      {hasActiveFiltersWithNoResults && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-yellow-400 dark:text-yellow-600" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('reports.noDataWithFilters')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {t('reports.clearFiltersToSeeData')}
          </p>
        </div>
      )}

      {/* KPI Cards and Charts (only show if there are filtered results) */}
      {filteredTransactions.length > 0 && (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total Income KPI */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl shadow-sm border border-green-200 dark:border-green-700 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  {t('reports.kpi.totalIncome')}
                </span>
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                €{totalIncome.toFixed(2)}
              </p>
            </div>

            {/* Total Expenses KPI */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl shadow-sm border border-red-200 dark:border-red-700 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-red-700 dark:text-red-300">
                  {t('reports.kpi.totalExpenses')}
                </span>
                <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                €{totalExpenses.toFixed(2)}
              </p>
            </div>

            {/* Balance KPI */}
            <div className={`bg-gradient-to-br rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow ${
              balance >= 0 
                ? 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700' 
                : 'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${
                  balance >= 0 
                    ? 'text-blue-700 dark:text-blue-300' 
                    : 'text-orange-700 dark:text-orange-300'
                }`}>
                  {t('reports.kpi.balance')}
                </span>
                <Wallet className={`h-5 w-5 ${
                  balance >= 0 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-orange-600 dark:text-orange-400'
                }`} />
              </div>
              <p className={`text-2xl font-bold ${
                balance >= 0 
                  ? 'text-blue-900 dark:text-blue-100' 
                  : 'text-orange-900 dark:text-orange-100'
              }`}>
                €{balance.toFixed(2)}
              </p>
            </div>

            {/* Transaction Count KPI */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl shadow-sm border border-purple-200 dark:border-purple-700 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  {t('reports.kpi.transactionCount')}
                </span>
                <Hash className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {transactionCount}
              </p>
            </div>

            {/* Average Transaction KPI */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('reports.kpi.avgTransaction')}
                </span>
                <Calculator className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                €{avgTransaction.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Charts with Filtered Data */}
          <Charts 
            transactions={chartTransactions}
            dateRange={{
              fromDate: filters.fromDate,
              toDate: filters.toDate
            }}
          />

          {/* Filtered Transactions Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('reports.filteredTransactions')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('reports.showingTransactions', { count: transactionCount })}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('common.date')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('common.type')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('common.category')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('common.description')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('common.amount')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {[...filteredTransactions]
                    .sort((a, b) => b.date.getTime() - a.date.getTime())
                    .map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {transaction.date.toLocaleDateString(language === 'lt' ? 'lt-LT' : 'en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            transaction.type === 'income'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                          }`}>
                            {t(transaction.type === 'income' ? 'common.income' : 'common.expense')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {transaction.category}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                          {transaction.description || '-'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                          transaction.type === 'income'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}€{transaction.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
