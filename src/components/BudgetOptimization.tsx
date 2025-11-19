import { useState } from 'react';
import { Sparkles, AlertCircle, Loader2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { useTransactions } from '../hooks/useTransactions';
import { useTranslation } from '../hooks/useTranslation';
import { aggregateBudgetForAi, hasEnoughDataForAi, generateAISuggestions, BudgetAiSummary } from '../utils/aiAnalysis';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export function BudgetOptimization() {
  const { transactions } = useTransactions();
  const { t, language } = useTranslation();
  
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<BudgetAiSummary | null>(null);

  const hasEnoughData = hasEnoughDataForAi(transactions);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setSuggestions([]);

    try {
      // Aggregate data for current month
      const now = new Date();
      const period = {
        from: startOfMonth(now),
        to: endOfMonth(now),
      };

      const aggregatedSummary = aggregateBudgetForAi(transactions, period, 'EUR');
      setSummary(aggregatedSummary);

      // Generate AI suggestions
      const results = await generateAISuggestions(aggregatedSummary, language);
      setSuggestions(results);
    } catch (err) {
      console.error('AI generation error:', err);
      setError(
        err instanceof Error 
          ? err.message 
          : t('budgetOptimization.errorGeneric')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {t('budgetOptimization.title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {t('budgetOptimization.description')}
            </p>
          </div>
        </div>
      </div>

      {/* Data Summary Card */}
      {summary && (
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 rounded-xl border border-blue-100 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('budgetOptimization.analyzedPeriod')}: {format(new Date(summary.period.from), 'MMM dd')} - {format(new Date(summary.period.to), 'MMM dd, yyyy')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                <TrendingUp className="w-5 h-5" />
                <span className="text-sm font-medium">{t('common.income')}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                €{summary.totalIncome.toFixed(2)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
                <TrendingDown className="w-5 h-5" />
                <span className="text-sm font-medium">{t('common.expense')}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                €{summary.totalExpenses.toFixed(2)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                <DollarSign className="w-5 h-5" />
                <span className="text-sm font-medium">{t('common.balance')}</span>
              </div>
              <p className={`text-2xl font-bold ${summary.savingsOrDeficit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {summary.savingsOrDeficit >= 0 ? '+' : ''}€{summary.savingsOrDeficit.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Not Enough Data Warning */}
      {!hasEnoughData && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">
                {t('budgetOptimization.notEnoughDataTitle')}
              </h3>
              <p className="text-amber-800 dark:text-amber-300 text-sm leading-relaxed">
                {t('budgetOptimization.notEnoughDataMessage')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Generate Button */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <button
          onClick={handleGenerate}
          disabled={!hasEnoughData || loading}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg font-semibold 
                     hover:from-blue-700 hover:to-purple-700 transition-all duration-200
                     disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-600 dark:disabled:to-gray-700 
                     disabled:cursor-not-allowed disabled:opacity-60
                     flex items-center justify-center gap-3 text-lg shadow-lg hover:shadow-xl"
        >
          {loading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              {t('budgetOptimization.generating')}
            </>
          ) : (
            <>
              <Sparkles className="w-6 h-6" />
              {t('budgetOptimization.generateButton')}
            </>
          )}
        </button>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
          {t('budgetOptimization.poweredBy')}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 dark:text-red-200 mb-1">
                {t('budgetOptimization.errorTitle')}
              </h3>
              <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
              <button
                onClick={handleGenerate}
                className="mt-3 text-sm text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 font-medium underline"
              >
                {t('budgetOptimization.retry')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-800 dark:to-gray-800 border border-green-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('budgetOptimization.suggestionsTitle')}
            </h3>
          </div>
          
          <ul className="space-y-3 mb-6">
            {suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-3 bg-white dark:bg-gray-700 rounded-lg p-4 border border-green-100 dark:border-gray-600">
                <span className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-green-500 to-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                  {index + 1}
                </span>
                <p className="text-gray-800 dark:text-gray-200 leading-relaxed flex-1">
                  {suggestion}
                </p>
              </li>
            ))}
          </ul>

          <div className="bg-blue-50 dark:bg-gray-700/50 border border-blue-200 dark:border-gray-600 rounded-lg p-4">
            <p className="text-sm text-blue-900 dark:text-blue-300 italic leading-relaxed">
              <strong>{t('budgetOptimization.disclaimerTitle')}:</strong> {t('budgetOptimization.disclaimerText')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
