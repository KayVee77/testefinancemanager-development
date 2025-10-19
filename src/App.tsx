import React, { useState, useEffect } from 'react';
import { Transaction, Category } from './types/Transaction';
import { User, AuthState } from './types/User';
import { getStoredTransactions, saveTransactions, getStoredCategories, saveCategories } from './utils/storage';
import { getCurrentUser, setCurrentUser, logout, authenticateUser, saveUser, emailExists, LoginCredentials, RegisterData } from './utils/auth';
import { Dashboard } from './components/Dashboard';
import { TransactionForm } from './components/TransactionForm';
import { TransactionList } from './components/TransactionList';
import { Charts } from './components/Charts';
import { AuthForm } from './components/AuthForm';
import { Plus, PieChart, List, BarChart3, Wallet, LogOut, User as UserIcon } from 'lucide-react';

function App() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true
  });

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'charts'>('dashboard');

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false
      });
    } else {
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false
      });
    }
  }, []);

  useEffect(() => {
    if (authState.user) {
      setTransactions(getStoredTransactions(authState.user.id));
      setCategories(getStoredCategories(authState.user.id));
    }
  }, [authState.user]);

  const handleLogin = async (credentials: LoginCredentials): Promise<boolean> => {
    const user = authenticateUser(credentials);
    if (user) {
      setCurrentUser(user);
      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false
      });
      return true;
    }
    return false;
  };

  const handleRegister = async (data: RegisterData): Promise<boolean> => {
    if (emailExists(data.email)) {
      return false;
    }

    const user = saveUser(data);
    setCurrentUser(user);
    setAuthState({
      user,
      isAuthenticated: true,
      isLoading: false
    });
    return true;
  };

  const handleLogout = () => {
    logout();
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false
    });
    setTransactions([]);
    setCategories([]);
    setActiveTab('dashboard');
  };

  const addTransaction = (transactionData: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (!authState.user) return;

    const newTransaction: Transaction = {
      ...transactionData,
      id: Date.now().toString(),
      createdAt: new Date()
    };

    const updatedTransactions = [...transactions, newTransaction];
    setTransactions(updatedTransactions);
    saveTransactions(authState.user.id, updatedTransactions);
  };

  const deleteTransaction = (id: string) => {
    if (!authState.user) return;

    const updatedTransactions = transactions.filter(t => t.id !== id);
    setTransactions(updatedTransactions);
    saveTransactions(authState.user.id, updatedTransactions);
  };

  const addCategory = (categoryData: Omit<Category, 'id'>) => {
    if (!authState.user) return;

    const newCategory: Category = {
      ...categoryData,
      id: Date.now().toString()
    };

    const updatedCategories = [...categories, newCategory];
    setCategories(updatedCategories);
    saveCategories(authState.user.id, updatedCategories);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard transactions={transactions} />;
      case 'transactions':
        return (
          <TransactionList
            transactions={transactions}
            categories={categories}
            onDeleteTransaction={deleteTransaction}
          />
        );
      case 'charts':
        return <Charts transactions={transactions} />;
      default:
        return <Dashboard transactions={transactions} />;
    }
  };

  if (authState.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Kraunama...</p>
        </div>
      </div>
    );
  }

  if (!authState.isAuthenticated) {
    return <AuthForm onLogin={handleLogin} onRegister={handleRegister} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Wallet className="h-8 w-8 mr-3 text-blue-600" />
                FinanceFlow
              </h1>
              <p className="text-gray-600 mt-1">
                Sveiki, {authState.user?.name}! Valdykite savo asmeninius finansus
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center text-sm text-gray-600 bg-white px-3 py-2 rounded-lg border border-gray-100">
                <UserIcon className="h-4 w-4 mr-2" />
                {authState.user?.email}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-colors border border-gray-200"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Atsijungti
              </button>
              <button
                onClick={() => setIsFormOpen(true)}
                className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
              >
                <Plus className="h-5 w-5 mr-2" />
                Pridėti transakciją
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 p-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center px-6 py-3 rounded-lg transition-all flex-1 justify-center ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <BarChart3 className="h-5 w-5 mr-2" />
              Apžvalga
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`flex items-center px-6 py-3 rounded-lg transition-all flex-1 justify-center ${
                activeTab === 'transactions'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <List className="h-5 w-5 mr-2" />
              Transakcijos
            </button>
            <button
              onClick={() => setActiveTab('charts')}
              className={`flex items-center px-6 py-3 rounded-lg transition-all flex-1 justify-center ${
                activeTab === 'charts'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <PieChart className="h-5 w-5 mr-2" />
              Grafikai
            </button>
          </div>
        </div>

        {/* Content */}
        {renderContent()}

        {/* Transaction Form Modal */}
        <TransactionForm
          categories={categories}
          onAddTransaction={addTransaction}
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onAddCategory={addCategory}
        />
      </div>
    </div>
  );
}

export default App;