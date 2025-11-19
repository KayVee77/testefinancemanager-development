import { useState, useEffect } from 'react';
import { Category, Transaction } from './types/Transaction';
import { getStoredCategories, saveCategories } from './utils/storage';
import { Dashboard } from './components/Dashboard';
import { TransactionForm } from './components/TransactionForm';
import { TransactionList } from './components/TransactionList';
import { ReportsSection } from './components/Reports/ReportsSection';
import { AuthForm } from './components/AuthForm';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './services/notificationService';
import { notificationService } from './services/notificationService';
import { showStorageWarning } from './utils/storageQuota';
import { useAuth } from './hooks/useAuth';
import { useTransactions } from './hooks/useTransactions';
import { useTheme } from './contexts/ThemeContext';
import { useLanguage } from './contexts/LanguageContext';
import { useTranslation } from './hooks/useTranslation';
import { Plus, List, BarChart3, Wallet, LogOut, User as UserIcon, Sun, Moon, Languages, FileText } from 'lucide-react';

/**
 * App Component - Main Application Entry Point
 * 
 * ✨ REFACTORED in Phase 2.1:
 * - Removed 180+ lines of state management code
 * - Uses Zustand stores via custom hooks (useAuth, useTransactions)
 * - No prop drilling - components access stores directly
 * - Reduced from 309 lines to ~120 lines (60% reduction)
 * 
 * Architecture: App.tsx now only handles:
 * - Auth initialization (useAuth hook)
 * - UI state (tabs, modals)
 * - Categories (simple array, stays in component state for now)
 * - Layout and routing
 */
function App() {
  // Theme from context
  const { theme, toggleTheme } = useTheme();
  
  // Translation hook
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  
  // Auth state from Zustand store
  const { user, isAuthenticated, isLoading, login, register, logout: authLogout, initialize } = useAuth();
  
  // Transaction state from Zustand store (transactions are auto-loaded by the hook)
  const { add: addTransaction, update: updateTransaction } = useTransactions();
  
  // Local UI state (not shared across components)
  const [categories, setCategories] = useState<Category[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'reports'>('dashboard');

  // Initialize auth on mount (checks localStorage or Cognito)
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Load categories when user logs in
  useEffect(() => {
    const loadCategories = async () => {
      if (user) {
        try {
          const loadedCategories = await getStoredCategories(user.id);
          setCategories(loadedCategories);
          
          // Check storage quota and show warning if needed
          showStorageWarning();
        } catch (error) {
          notificationService.error('Nepavyko užkrauti kategorijų');
        }
      }
    };
    
    loadCategories();
  }, [user?.id]);

  // Handle login
  const handleLogin = async (credentials: { email: string; password: string }): Promise<boolean> => {
    try {
      await login(credentials);
      return true;
    } catch (error) {
      // Error notification already shown by authService
      return false;
    }
  };

  // Handle registration
  const handleRegister = async (data: { name: string; email: string; password: string }): Promise<boolean> => {
    try {
      await register(data);
      return true;
    } catch (error) {
      // Error notification already shown by authService
      return false;
    }
  };

  // Handle logout
  const handleLogout = async () => {
    await authLogout();
    setCategories([]);
    setActiveTab('dashboard');
  };

  // Handle editing a transaction
  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  };

  // Handle updating a transaction
  const handleUpdateTransaction = async (id: string, updates: Partial<Transaction>) => {
    try {
      await updateTransaction(id, updates);
      setIsFormOpen(false);
      setEditingTransaction(null);
    } catch (error) {
      // Error handled by hook
    }
  };

  // Handle closing form (reset editing state)
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingTransaction(null);
  };

  // Handle adding new category
  const addCategory = async (categoryData: Omit<Category, 'id'>) => {
    if (!user) return;

    try {
      const newCategory: Category = {
        ...categoryData,
        id: Date.now().toString()
      };

      const updatedCategories = [...categories, newCategory];
      setCategories(updatedCategories);
      await saveCategories(user.id, updatedCategories);
      notificationService.success(t('transactions.addCategory'));
    } catch (error) {
      notificationService.error(t('common.error'));
      // Revert on error
      setCategories(categories);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'transactions':
        return <TransactionList categories={categories} onEdit={handleEditTransaction} />;
      case 'reports':
        return <ReportsSection />;
      default:
        return <Dashboard />;
    }
  };

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Auth screen
  if (!isAuthenticated) {
    return <AuthForm onLogin={handleLogin} onRegister={handleRegister} />;
  }

  return (
    <ErrorBoundary componentName="App">
      <Toaster />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                <Wallet className="h-8 w-8 mr-3 text-blue-600 dark:text-blue-400" />
                FinanceFlow
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                {t('dashboard.welcome', { name: user?.name || '' })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Language Toggle Button */}
              <button
                onClick={() => setLanguage(language === 'lt' ? 'en' : 'lt')}
                className="flex items-center px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
                aria-label="Toggle language"
                title={language === 'lt' ? 'Switch to English' : 'Pereiti į lietuvių kalbą'}
              >
                <Languages className="h-5 w-5 mr-1" />
                <span className="text-sm font-medium">{language.toUpperCase()}</span>
              </button>
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="flex items-center px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
              </button>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-700">
                <UserIcon className="h-4 w-4 mr-2" />
                {user?.email}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t('auth.logout')}
              </button>
              <button
                onClick={() => {
                  setEditingTransaction(null);
                  setIsFormOpen(true);
                }}
                className="flex items-center px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-lg hover:shadow-xl"
              >
                <Plus className="h-5 w-5 mr-2" />
                {t('dashboard.addTransaction')}
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="flex bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center px-6 py-3 rounded-lg transition-all flex-1 justify-center ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <BarChart3 className="h-5 w-5 mr-2" />
              {t('nav.dashboard')}
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`flex items-center px-6 py-3 rounded-lg transition-all flex-1 justify-center ${
                activeTab === 'transactions'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <List className="h-5 w-5 mr-2" />
              {t('nav.transactions')}
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center px-6 py-3 rounded-lg transition-all flex-1 justify-center ${
                activeTab === 'reports'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <FileText className="h-5 w-5 mr-2" />
              {t('nav.reports')}
            </button>
          </div>
        </div>

        {/* Content */}
        {renderContent()}

        {/* Transaction Form Modal */}
        <TransactionForm
          categories={categories}
          onAddTransaction={addTransaction}
          onUpdateTransaction={handleUpdateTransaction}
          initialData={editingTransaction}
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          onAddCategory={addCategory}
        />
      </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;