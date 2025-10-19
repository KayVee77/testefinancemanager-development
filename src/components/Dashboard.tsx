import React from 'react';
import { Transaction } from '../types/Transaction';
import { getTotalIncome, getTotalExpenses, getBalance } from '../utils/calculations';
import { TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
}

export const Dashboard: React.FC<DashboardProps> = ({ transactions }) => {
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Bendras balansas</p>
            <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              €{balance.toFixed(2)}
            </p>
          </div>
          <div className={`p-3 rounded-full ${balance >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
            <Wallet className={`h-6 w-6 ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Bendros pajamos</p>
            <p className="text-2xl font-bold text-green-600">€{totalIncome.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">Šį mėnesį: €{monthlyIncome.toFixed(2)}</p>
          </div>
          <div className="p-3 bg-green-100 rounded-full">
            <TrendingUp className="h-6 w-6 text-green-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Bendros išlaidos</p>
            <p className="text-2xl font-bold text-red-600">€{totalExpenses.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">Šį mėnesį: €{monthlyExpenses.toFixed(2)}</p>
          </div>
          <div className="p-3 bg-red-100 rounded-full">
            <TrendingDown className="h-6 w-6 text-red-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Mėnesio balansas</p>
            <p className={`text-2xl font-bold ${monthlyIncome - monthlyExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              €{(monthlyIncome - monthlyExpenses).toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {new Date().toLocaleDateString('lt-LT', { month: 'long', year: 'numeric' })}
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