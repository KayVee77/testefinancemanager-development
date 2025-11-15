import React from 'react';
import { useTransactions } from '../hooks/useTransactions';
import { useTranslation } from '../hooks/useTranslation';
import { getTotalIncome, getTotalExpenses, getBalance } from '../utils/calculations';
import { TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';

/**
 * Dashboard Component - Financial Overview Cards
 * 
 * ✨ REFACTORED in Phase 2.1:
 * - Removed transactions prop (was prop drilling from App.tsx)
 * - Uses useTransactions() hook to access Zustand store directly
 * - No props needed - self-contained component
 */
export const Dashboard: React.FC = () => {
  const { transactions } = useTransactions();
  const { t, language } = useTranslation();

  const totalIncome = getTotalIncome(transactions);
  const totalExpenses = getTotalExpenses(transactions);
  const balance = getBalance(transactions);

  const currentMonth = new Date();
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  
  const currentMonthTransactions = transactions.filter(t => 
    t.date >= monthStart && t.date <= monthEnd
  );
  
  const monthlyIncome = getTotalIncome(currentMonthTransactions);
  const monthlyExpenses = getTotalExpenses(currentMonthTransactions);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{t('dashboard.totalBalance')}</p>
            <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              €{balance.toFixed(2)}
            </p>
          </div>
          <div className={`p-3 rounded-full ${balance >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
            <Wallet className={`h-6 w-6 ${balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{t('dashboard.totalIncome')}</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">€{totalIncome.toFixed(2)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('dashboard.thisMonth', { amount: `€${monthlyIncome.toFixed(2)}` })}
            </p>
          </div>
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
            <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{t('dashboard.totalExpenses')}</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">€{totalExpenses.toFixed(2)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('dashboard.thisMonth', { amount: `€${monthlyExpenses.toFixed(2)}` })}
            </p>
          </div>
          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
            <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{t('dashboard.monthBalance')}</p>
            <p className={`text-2xl font-bold ${monthlyIncome - monthlyExpenses >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              €{(monthlyIncome - monthlyExpenses).toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {new Date().toLocaleDateString(language === 'lt' ? 'lt-LT' : 'en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className={`p-3 rounded-full ${monthlyIncome - monthlyExpenses >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
            <DollarSign className={`h-6 w-6 ${monthlyIncome - monthlyExpenses >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
          </div>
        </div>
      </div>
    </div>
  );
};