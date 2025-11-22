import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';
import { enUS, lt as ltLocale } from 'date-fns/locale';
import { Transaction } from '../types/Transaction';
import { useTransactions } from '../hooks/useTransactions';
import { useTranslation } from '../hooks/useTranslation';
import { useReportFilters } from '../stores/reportFiltersStore';
import { translateCategoryName } from '../i18n';
import { calculateMonthlyData, calculateCategorySummary } from '../utils/calculations';
import { AlertCircle } from 'lucide-react';

interface ChartsProps {
  /**
   * Optional transaction array for filtering (e.g., from Reports section)
   * If not provided, defaults to all transactions from store
   */
  transactions?: Transaction[];
  /**
   * Optional date range for chart X-axis (for Reports filtering)
   * When provided, charts will only show data within this range
   * See Bugs/FunctionalityTesting/bug2.md
   */
  dateRange?: {
    fromDate?: Date | null;
    toDate?: Date | null;
  };
}

/**
 * Charts Component - Financial Data Visualizations
 * 
 * ✨ REFACTORED in Phase 2.1:
 * - Removed transactions prop (was prop drilling from App.tsx)
 * - Uses useTransactions() hook to access Zustand store directly
 * - No props needed - self-contained component
 * 
 * ✨ ENHANCED in Phase 2.2 (Reports Feature):
 * - Added optional transactions prop for filtered data support
 * - Maintains backward compatibility (defaults to store if prop not provided)
 * - Enables Reports section to pass filtered transaction array
 * - Added dateRange prop to control chart X-axis range (bug2 fix)
 */
export const Charts: React.FC<ChartsProps> = ({ transactions: transactionsProp, dateRange }) => {
  const { transactions: storeTransactions } = useTransactions();
  const { filters } = useReportFilters();
  const { t, language } = useTranslation();
  const locale = language === 'lt' ? ltLocale : enUS;
  
  // Use prop if provided, otherwise fall back to store (backward compatibility)
  const baseTransactions = transactionsProp ?? storeTransactions;

  // Check which types are enabled (for conditional line rendering)
  const showIncome = filters.selectedTypes.includes('income');
  const showExpenses = filters.selectedTypes.includes('expense');
  const noTypesSelected = !showIncome && !showExpenses;

  // For line chart: apply type filter
  const lineChartTransactions = React.useMemo(() => {
    if (filters.selectedTypes.length === 0 || filters.selectedTypes.length === 2) {
      return baseTransactions;
    }
    return baseTransactions.filter(t => filters.selectedTypes.includes(t.type));
  }, [baseTransactions, filters.selectedTypes]);

  const monthlyData = calculateMonthlyData(
    lineChartTransactions,
    dateRange?.fromDate,
    dateRange?.toDate,
    locale
  );

  // For pie charts: NEVER apply type filter, only date/category filters
  // Each pie chart naturally filters by its own type in calculateCategorySummary
  const expenseCategories = calculateCategorySummary(baseTransactions, 'expense');
  const incomeCategories = calculateCategorySummary(baseTransactions, 'income');

  // Translate category names for display
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-900 mb-2">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.dataKey === 'income' ? t('charts.income') : t('charts.expenses')}: €${entry.value.toFixed(2)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-900">{translateCategoryName(data.category, language)}</p>
          <p className="text-sm text-gray-600">€{data.amount.toFixed(2)}</p>
          <p className="text-sm text-gray-600">{data.percentage.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Monthly Trends */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('charts.monthlyTrends')}</h3>
        
        {noTypesSelected ? (
          // Empty state when both toggles are OFF
          <div className="h-80 flex flex-col items-center justify-center text-gray-400">
            <AlertCircle className="h-16 w-16 mb-4" />
            <p className="text-sm font-medium">{t('charts.noDataSelected')}</p>
            <p className="text-xs mt-1">{t('charts.enableTypeToSeeData')}</p>
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                  tickFormatter={(value) => `€${value}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {showIncome && (
                  <Line 
                    type="monotone" 
                    dataKey="income" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                    name={t('charts.income')}
                  />
                )}
                {showExpenses && (
                  <Line 
                    type="monotone" 
                    dataKey="expenses" 
                    stroke="#EF4444" 
                    strokeWidth={3}
                    dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                    name={t('charts.expenses')}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Expense Categories */}
        {expenseCategories.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('charts.expenseCategories')}</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseCategories}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="amount"
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {expenseCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4">
              <div className="grid grid-cols-2 gap-2">
                {expenseCategories.slice(0, 6).map((category, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm text-gray-600 truncate">
                      {translateCategoryName(category.category, language)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Income Categories */}
        {incomeCategories.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('charts.incomeCategories')}</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={incomeCategories}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="amount"
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {incomeCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4">
              <div className="grid grid-cols-2 gap-2">
                {incomeCategories.slice(0, 6).map((category, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm text-gray-600 truncate">
                      {translateCategoryName(category.category, language)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('charts.incomeCategories')}</h3>
            <div className="h-64 flex flex-col items-center justify-center text-gray-400">
              <AlertCircle className="h-16 w-16 mb-4" />
              <p className="text-sm font-medium">{t('charts.noData')}</p>
              <p className="text-xs mt-1">{t('charts.noIncomeDataForPeriod')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
