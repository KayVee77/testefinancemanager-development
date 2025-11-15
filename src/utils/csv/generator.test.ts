/**
 * Tests for CSV Generator
 */

import { describe, it, expect } from 'vitest';
import { generateCSV, generateFilename, generateTemplate } from './generator';
import { Transaction } from '../../types/Transaction';

describe('generateCSV', () => {
  const mockTransactions: Transaction[] = [
    {
      id: '1',
      type: 'expense',
      category: 'Maistas',
      amount: 25.50,
      description: 'Lunch at restaurant',
      date: new Date(2025, 10, 16),
      createdAt: new Date(2025, 10, 16)
    },
    {
      id: '2',
      type: 'income',
      category: 'Atlyginimas',
      amount: 2000.00,
      description: 'Monthly salary',
      date: new Date(2025, 10, 15),
      createdAt: new Date(2025, 10, 15)
    }
  ];

  it('should generate CSV with header', () => {
    const csv = generateCSV(mockTransactions, 'lt', true);
    const lines = csv.split('\n');

    expect(lines[0]).toBe('Data,Tipas,Kategorija,Suma,Aprašymas'); // Lithuanian header
    expect(lines.length).toBe(3); // Header + 2 data rows
  });

  it('should generate CSV without header', () => {
    const csv = generateCSV(mockTransactions, 'lt', false);
    const lines = csv.split('\n');

    expect(lines[0]).not.toContain('Data,Tipas');
    expect(lines.length).toBe(2); // Only data rows
  });

  it('should format dates as YYYY-MM-DD', () => {
    const csv = generateCSV(mockTransactions, 'lt', true);
    const lines = csv.split('\n');

    expect(lines[1]).toContain('2025-11-16');
    expect(lines[2]).toContain('2025-11-15');
  });

  it('should format amounts with 2 decimal places', () => {
    const csv = generateCSV(mockTransactions, 'lt', true);

    expect(csv).toContain('25.50');
    expect(csv).toContain('2000.00');
  });

  it('should sort by date (newest first)', () => {
    const csv = generateCSV(mockTransactions, 'lt', true);
    const lines = csv.split('\n');

    // First data row should be 2025-11-16 (newest)
    expect(lines[1]).toContain('2025-11-16');
    // Second data row should be 2025-11-15 (older)
    expect(lines[2]).toContain('2025-11-15');
  });

  it('should include all transaction fields', () => {
    const csv = generateCSV(mockTransactions, 'lt', true);
    const lines = csv.split('\n');
    const firstData = lines[1];

    expect(firstData).toContain('2025-11-16');
    expect(firstData).toContain('Išlaidos'); // Lithuanian for expense
    expect(firstData).toContain('Maistas');
    expect(firstData).toContain('25.50');
    expect(firstData).toContain('Lunch at restaurant');
  });

  it('should escape descriptions with commas', () => {
    const transaction: Transaction = {
      id: '1',
      type: 'expense',
      category: 'Maistas',
      amount: 25.50,
      description: 'Lunch at restaurant, very nice',
      date: new Date(2025, 10, 16),
      createdAt: new Date(2025, 10, 16)
    };

    const csv = generateCSV([transaction], 'lt', true);

    expect(csv).toContain('"Lunch at restaurant, very nice"');
  });

  it('should escape descriptions with quotes', () => {
    const transaction: Transaction = {
      id: '1',
      type: 'expense',
      category: 'Maistas',
      amount: 25.50,
      description: 'Lunch at "Best" restaurant',
      date: new Date(2025, 10, 16),
      createdAt: new Date(2025, 10, 16)
    };

    const csv = generateCSV([transaction], 'lt', true);

    expect(csv).toContain('""Best""'); // Quotes doubled
  });

  it('should handle empty description', () => {
    const transaction: Transaction = {
      id: '1',
      type: 'expense',
      category: 'Maistas',
      amount: 25.50,
      description: '',
      date: new Date(2025, 10, 16),
      createdAt: new Date(2025, 10, 16)
    };

    const csv = generateCSV([transaction], 'lt', true);
    const lines = csv.split('\n');

    expect(lines[1]).toMatch(/25\.50,$/); // Ends with amount and empty field
  });

  it('should handle empty array', () => {
    const csv = generateCSV([], 'lt', true);
    const lines = csv.split('\n');

    expect(lines.length).toBe(1); // Only header
    expect(lines[0]).toBe('Data,Tipas,Kategorija,Suma,Aprašymas'); // Lithuanian header
  });

  it('should handle single transaction', () => {
    const csv = generateCSV([mockTransactions[0]], 'lt', true);
    const lines = csv.split('\n');

    expect(lines.length).toBe(2); // Header + 1 data row
  });

  it('should not modify original array', () => {
    const original = [...mockTransactions];
    generateCSV(mockTransactions, 'lt', true);

    expect(mockTransactions).toEqual(original);
  });

  it('should translate headers and data to English', () => {
    const csv = generateCSV(mockTransactions, 'en', true);
    const lines = csv.split('\n');

    // Check English header
    expect(lines[0]).toBe('Date,Type,Category,Amount,Description');
    
    // Check English type translation
    expect(lines[1]).toContain('Expense'); // English for expense
    expect(lines[2]).toContain('Income'); // English for income
    
    // Check English category translation
    expect(lines[1]).toContain('Food'); // English for Maistas
    expect(lines[2]).toContain('Salary'); // English for Atlyginimas
  });

  it('should translate headers and data to Lithuanian', () => {
    const csv = generateCSV(mockTransactions, 'lt', true);
    const lines = csv.split('\n');

    // Check Lithuanian header
    expect(lines[0]).toBe('Data,Tipas,Kategorija,Suma,Aprašymas');
    
    // Check Lithuanian type translation
    expect(lines[1]).toContain('Išlaidos'); // Lithuanian for expense
    expect(lines[2]).toContain('Pajamos'); // Lithuanian for income
    
    // Check Lithuanian category (stays as is - stored in Lithuanian)
    expect(lines[1]).toContain('Maistas');
    expect(lines[2]).toContain('Atlyginimas');
  });
});

describe('generateFilename', () => {
  it('should generate filename with current date', () => {
    const filename = generateFilename();

    expect(filename).toMatch(/^financeflow-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(filename).toContain('financeflow-');
    expect(filename.endsWith('.csv')).toBe(true);
  });

  it('should generate unique filenames (date-based)', () => {
    const filename1 = generateFilename();
    const filename2 = generateFilename();

    // Same day should generate same filename
    expect(filename1).toBe(filename2);
  });
});

describe('generateTemplate', () => {
  it('should generate template with header', () => {
    const template = generateTemplate();
    const lines = template.split('\n');

    expect(lines[0]).toBe('Date,Type,Category,Amount,Description');
  });

  it('should generate template with example rows', () => {
    const template = generateTemplate();
    const lines = template.split('\n');

    expect(lines.length).toBeGreaterThan(1);
    expect(lines[1]).toMatch(/^\d{4}-\d{2}-\d{2}/); // Starts with date
  });

  it('should include both income and expense examples', () => {
    const template = generateTemplate();

    expect(template).toContain(',income,');
    expect(template).toContain(',expense,');
  });

  it('should include valid example data', () => {
    const template = generateTemplate();

    // Should include recognizable categories and amounts
    expect(template).toMatch(/\d+\.\d{2}/); // Amount with 2 decimals
    expect(template.length).toBeGreaterThan(100); // Has substantial content
  });
});
