/**
 * Tests for CSV Parser
 */

import { describe, it, expect } from 'vitest';
import { parseCSV, validateCSVFile } from './parser';

describe('parseCSV', () => {
  it('should parse valid CSV with header', () => {
    const csv = `Date,Type,Category,Amount,Description
2025-11-16,expense,Maistas,25.50,Lunch
2025-11-15,income,Atlyginimas,2000.00,Salary`;

    const result = parseCSV(csv);

    expect(result.summary.totalRows).toBe(2);
    expect(result.summary.validRows).toBe(2);
    expect(result.summary.errorRows).toBe(0);
    expect(result.valid).toHaveLength(2);
    expect(result.errors).toHaveLength(0);

    // Check first transaction
    expect(result.valid[0].type).toBe('expense');
    expect(result.valid[0].category).toBe('Maistas');
    expect(result.valid[0].amount).toBe(25.50);
    expect(result.valid[0].description).toBe('Lunch');
    expect(result.valid[0].date).toEqual(new Date(2025, 10, 16));

    // Check second transaction
    expect(result.valid[1].type).toBe('income');
    expect(result.valid[1].category).toBe('Atlyginimas');
    expect(result.valid[1].amount).toBe(2000.00);
  });

  it('should parse valid CSV without header', () => {
    const csv = `2025-11-16,expense,Maistas,25.50,Lunch
2025-11-15,income,Atlyginimas,2000.00,Salary`;

    const result = parseCSV(csv);

    expect(result.summary.validRows).toBe(2);
    expect(result.valid).toHaveLength(2);
  });

  it('should handle empty description', () => {
    const csv = `2025-11-16,expense,Maistas,25.50,`;

    const result = parseCSV(csv);

    expect(result.summary.validRows).toBe(1);
    expect(result.valid[0].description).toBe('');
  });

  it('should handle description with special characters', () => {
    const csv = `2025-11-16,expense,Maistas,25.50,Lunch at restaurant - very nice!`;

    const result = parseCSV(csv);

    expect(result.summary.validRows).toBe(1);
    expect(result.valid[0].description).toBe('Lunch at restaurant - very nice!');
  });

  it('should reject invalid date format', () => {
    const csv = `16-11-2025,expense,Maistas,25.50,Lunch`;

    const result = parseCSV(csv);

    expect(result.summary.validRows).toBe(0);
    expect(result.summary.errorRows).toBe(1);
    expect(result.errors[0].field).toBe('date');
    expect(result.errors[0].reason).toContain('Invalid date format');
  });

  it('should reject invalid type', () => {
    const csv = `2025-11-16,spending,Maistas,25.50,Lunch`;

    const result = parseCSV(csv);

    expect(result.summary.errorRows).toBe(1);
    expect(result.errors[0].field).toBe('type');
    expect(result.errors[0].reason).toContain('income');
  });

  it('should reject empty category', () => {
    const csv = `2025-11-16,expense,,25.50,Lunch`;

    const result = parseCSV(csv);

    expect(result.summary.errorRows).toBe(1);
    expect(result.errors[0].field).toBe('category');
    expect(result.errors[0].reason).toContain('required');
  });

  it('should reject invalid amount', () => {
    const csv = `2025-11-16,expense,Maistas,abc,Lunch`;

    const result = parseCSV(csv);

    expect(result.summary.errorRows).toBe(1);
    expect(result.errors[0].field).toBe('amount');
  });

  it('should reject negative amount', () => {
    const csv = `2025-11-16,expense,Maistas,-25.50,Lunch`;

    const result = parseCSV(csv);

    expect(result.summary.errorRows).toBe(1);
    expect(result.errors[0].field).toBe('amount');
    expect(result.errors[0].reason).toContain('positive');
  });

  it('should reject zero amount', () => {
    const csv = `2025-11-16,expense,Maistas,0,Lunch`;

    const result = parseCSV(csv);

    expect(result.summary.errorRows).toBe(1);
    expect(result.errors[0].field).toBe('amount');
  });

  it('should handle amount with currency symbols', () => {
    const csv = `2025-11-16,expense,Maistas,€25.50,Lunch`;

    const result = parseCSV(csv);

    expect(result.summary.validRows).toBe(1);
    expect(result.valid[0].amount).toBe(25.50);
  });

  it('should reject rows with too few columns', () => {
    const csv = `2025-11-16,expense,Maistas`;

    const result = parseCSV(csv);

    expect(result.summary.errorRows).toBe(1);
    expect(result.errors[0].field).toBe('columns');
  });

  it('should handle empty file', () => {
    const csv = '';

    const result = parseCSV(csv);

    expect(result.summary.totalRows).toBe(0);
    expect(result.summary.validRows).toBe(0);
    expect(result.summary.errorRows).toBe(1);
    expect(result.errors[0].reason).toContain('empty');
  });

  it('should handle mixed valid and invalid rows', () => {
    const csv = `Date,Type,Category,Amount,Description
2025-11-16,expense,Maistas,25.50,Valid row
invalid-date,expense,Maistas,25.50,Invalid date
2025-11-15,income,Atlyginimas,2000.00,Valid row
2025-11-14,expense,,10.00,Missing category`;

    const result = parseCSV(csv);

    expect(result.summary.totalRows).toBe(4);
    expect(result.summary.validRows).toBe(2);
    expect(result.summary.errorRows).toBe(2);
    expect(result.valid).toHaveLength(2);
    expect(result.errors).toHaveLength(2);
  });

  it('should generate unique IDs for each transaction', () => {
    const csv = `2025-11-16,expense,Maistas,25.50,Lunch 1
2025-11-15,expense,Maistas,25.50,Lunch 2`;

    const result = parseCSV(csv);

    expect(result.valid[0].id).toBeTruthy();
    expect(result.valid[1].id).toBeTruthy();
    expect(result.valid[0].id).not.toBe(result.valid[1].id);
  });

  it('should set createdAt timestamp', () => {
    const csv = `2025-11-16,expense,Maistas,25.50,Lunch`;

    const result = parseCSV(csv);

    expect(result.valid[0].createdAt).toBeInstanceOf(Date);
  });

  it('should skip empty lines', () => {
    const csv = `2025-11-16,expense,Maistas,25.50,Lunch

2025-11-15,income,Atlyginimas,2000.00,Salary
`;

    const result = parseCSV(csv);

    expect(result.summary.validRows).toBe(2);
  });

  it('should handle whitespace in fields', () => {
    const csv = `2025-11-16 , expense , Maistas , 25.50 , Lunch `;

    const result = parseCSV(csv);

    expect(result.summary.validRows).toBe(1);
    expect(result.valid[0].type).toBe('expense');
    expect(result.valid[0].category).toBe('Maistas');
  });
});

describe('validateCSVFile', () => {
  it('should accept valid CSV file', () => {
    const file = new File(['test'], 'transactions.csv', { type: 'text/csv' });
    const result = validateCSVFile(file);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject non-CSV file', () => {
    const file = new File(['test'], 'transactions.txt', { type: 'text/plain' });
    const result = validateCSVFile(file);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('CSV');
  });

  it('should reject empty file', () => {
    const file = new File([], 'transactions.csv', { type: 'text/csv' });
    const result = validateCSVFile(file);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('should reject file larger than 5MB', () => {
    // Create a large blob (6MB)
    const largeContent = new Array(6 * 1024 * 1024).fill('a').join('');
    const file = new File([largeContent], 'large.csv', { type: 'text/csv' });
    const result = validateCSVFile(file);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('large');
  });
});
