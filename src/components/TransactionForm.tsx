import React, { useState } from 'react';
import { Transaction, Category } from '../types/Transaction';
import { Plus, X } from 'lucide-react';
import { sanitizeAndTrim } from '../utils/sanitize';
import { useTranslation } from '../hooks/useTranslation';
import { translateCategoryName } from '../i18n';

interface TransactionFormProps {
  categories: Category[];
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
  isOpen: boolean;
  onClose: () => void;
  onAddCategory: (category: Omit<Category, 'id'>) => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  categories,
  onAddTransaction,
  isOpen,
  onClose,
  onAddCategory
}) => {
  const { t, language } = useTranslation();
  
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6');

  const filteredCategories = categories.filter(cat => cat.type === type);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !description || !category) return;

    // Sanitize inputs before processing
    const sanitizedDescription = sanitizeAndTrim(description);
    const sanitizedCategory = sanitizeAndTrim(category);

    if (!sanitizedDescription || !sanitizedCategory) {
      // If sanitization results in empty strings, don't submit
      return;
    }

    onAddTransaction({
      amount: parseFloat(amount),
      description: sanitizedDescription,
      category: sanitizedCategory,
      type,
      date: new Date(date)
    });

    // Reset form
    setAmount('');
    setDescription('');
    setCategory('');
    setDate(new Date().toISOString().split('T')[0]);
    onClose();
  };

  const handleAddCategory = () => {
    const sanitizedName = sanitizeAndTrim(newCategoryName);
    if (!sanitizedName) return;

    onAddCategory({
      name: sanitizedName,
      color: newCategoryColor,
      icon: 'circle',
      type
    });

    setNewCategoryName('');
    setShowNewCategory(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('transactions.addTransaction')}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('transactions.transactionType')}
            </label>
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  type === 'expense'
                    ? 'bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {t('transactions.typeExpense')}
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  type === 'income'
                    ? 'bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {t('transactions.typeIncome')}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('transactions.transactionAmount')}
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('transactions.transactionDescription')}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('transactions.transactionDescriptionPlaceholder')}
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('transactions.transactionCategory')}
              </label>
              <button
                type="button"
                onClick={() => setShowNewCategory(!showNewCategory)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('transactions.newCategory')}
              </button>
            </div>
            
            {showNewCategory && (
              <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded"
                    placeholder={t('transactions.categoryName')}
                  />
                  <input
                    type="color"
                    value={newCategoryColor}
                    onChange={(e) => setNewCategoryColor(e.target.value)}
                    className="w-8 h-7 border border-gray-300 dark:border-gray-600 rounded"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="w-full text-sm bg-blue-600 dark:bg-blue-500 text-white py-1 rounded hover:bg-blue-700 dark:hover:bg-blue-600"
                >
                  {t('transactions.addCategory')}
                </button>
              </div>
            )}
            
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">{t('transactions.selectCategory')}</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {translateCategoryName(cat.name, language)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('transactions.transactionDate')}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {t('transactions.cancelButton')}
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              {t('transactions.addButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};