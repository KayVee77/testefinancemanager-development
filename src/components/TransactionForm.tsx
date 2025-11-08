import React, { useState } from 'react';
import { Transaction, Category } from '../types/Transaction';
import { Plus, X } from 'lucide-react';
import { sanitizeAndTrim } from '../utils/sanitize';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Pridėti transakciją</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipas
            </label>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  type === 'expense'
                    ? 'bg-white text-red-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Išlaidos
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  type === 'income'
                    ? 'bg-white text-green-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Pajamos
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Suma (€)
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Aprašymas
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Transakcijos aprašymas"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Kategorija
              </label>
              <button
                type="button"
                onClick={() => setShowNewCategory(!showNewCategory)}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                Nauja
              </button>
            </div>
            
            {showNewCategory && (
              <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                    placeholder="Kategorijos pavadinimas"
                  />
                  <input
                    type="color"
                    value={newCategoryColor}
                    onChange={(e) => setNewCategoryColor(e.target.value)}
                    className="w-8 h-7 border border-gray-300 rounded"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="w-full text-sm bg-blue-600 text-white py-1 rounded hover:bg-blue-700"
                >
                  Pridėti kategoriją
                </button>
              </div>
            )}
            
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Pasirinkite kategoriją</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Atšaukti
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Pridėti
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};