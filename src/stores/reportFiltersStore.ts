/**
 * Report Filters Store - Zustand Store for Reports Filtering State
 * 
 * Manages filtering state for the Reports/Analytics section:
 * - Date range (from/to)
 * - Selected categories
 * - Selected transaction types (income/expense)
 * 
 * Persists filter state across navigation
 */

import { create } from 'zustand';

export interface ReportFilters {
  fromDate: Date | null;
  toDate: Date | null;
  selectedCategories: string[];
  selectedTypes: ('income' | 'expense')[];
}

interface ReportFiltersState {
  filters: ReportFilters;
  setDateRange: (from: Date | null, to: Date | null) => void;
  setFromDate: (date: Date | null) => void;
  setToDate: (date: Date | null) => void;
  setCategories: (categories: string[]) => void;
  toggleCategory: (category: string) => void;
  setTypes: (types: ('income' | 'expense')[]) => void;
  toggleType: (type: 'income' | 'expense') => void;
  resetFilters: () => void;
  applyQuickFilter: (filter: 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'thisYear') => void;
  hasActiveFilters: () => boolean;
}

const initialFilters: ReportFilters = {
  fromDate: null,
  toDate: null,
  selectedCategories: [],
  selectedTypes: ['income', 'expense'],
};

export const useReportFilters = create<ReportFiltersState>((set, get) => ({
  filters: initialFilters,

  setDateRange: (from, to) => set(state => ({
    filters: { ...state.filters, fromDate: from, toDate: to }
  })),

  setFromDate: (date) => set(state => ({
    filters: { ...state.filters, fromDate: date }
  })),

  setToDate: (date) => set(state => ({
    filters: { ...state.filters, toDate: date }
  })),

  setCategories: (categories) => set(state => ({
    filters: { ...state.filters, selectedCategories: categories }
  })),

  toggleCategory: (category) => set(state => {
    const current = state.filters.selectedCategories;
    const newCategories = current.includes(category)
      ? current.filter(c => c !== category)
      : [...current, category];
    
    return {
      filters: { ...state.filters, selectedCategories: newCategories }
    };
  }),

  setTypes: (types) => set(state => ({
    filters: { ...state.filters, selectedTypes: types }
  })),

  toggleType: (type) => set(state => {
    const current = state.filters.selectedTypes;
    const newTypes = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    
    return {
      filters: { ...state.filters, selectedTypes: newTypes as ('income' | 'expense')[]}
    };
  }),

  resetFilters: () => set({ filters: initialFilters }),

  applyQuickFilter: (filter) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let from: Date | null = null;
    let to: Date | null = null;

    switch (filter) {
      case 'last7days':
        from = new Date(today);
        from.setDate(from.getDate() - 6);
        to = today;
        break;
      
      case 'last30days':
        from = new Date(today);
        from.setDate(from.getDate() - 29);
        to = today;
        break;
      
      case 'thisMonth':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      
      case 'lastMonth':
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      
      case 'thisYear':
        from = new Date(now.getFullYear(), 0, 1);
        to = new Date(now.getFullYear(), 11, 31);
        break;
    }

    set(state => ({
      filters: { ...state.filters, fromDate: from, toDate: to }
    }));
  },

  hasActiveFilters: () => {
    const { filters } = get();
    return (
      filters.fromDate !== null ||
      filters.toDate !== null ||
      filters.selectedCategories.length > 0 ||
      filters.selectedTypes.length < 2
    );
  },
}));
