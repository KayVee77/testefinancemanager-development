/**
 * CSV Parser - Import Transactions from CSV Files
 * 
 * Supports format: Date,Type,Category,Amount,Description
 * Example: 2025-11-16,expense,Maistas,25.50,Lunch at restaurant
 * 
 * Features:
 * - Validates all required fields
 * - Generates unique IDs for transactions
 * - Returns both valid transactions and detailed errors
 * - Handles edge cases (empty lines, invalid data, etc.)
 * - Accepts both English and Lithuanian type values for round-trip export/import
 */

import { Transaction } from '../../types/Transaction';

/**
 * Error information for a single CSV row
 */
export interface ParseError {
  row: number;
  field: string;
  value: string;
  reason: string;
}

/**
 * Result of CSV parsing operation
 */
export interface ParseResult {
  valid: Transaction[];
  errors: ParseError[];
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
  };
}

/**
 * Normalize localized type values to English
 * Supports both English and Lithuanian for round-trip export/import
 * 
 * @param typeStr - Type value from CSV (case-insensitive)
 * @returns 'income', 'expense', or null if invalid
 */
const normalizeType = (typeStr: string): 'income' | 'expense' | null => {
  const normalized = typeStr.toLowerCase().trim();
  
  // English values
  if (normalized === 'income') return 'income';
  if (normalized === 'expense') return 'expense';
  
  // Lithuanian values (from CSV export)
  if (normalized === 'pajamos') return 'income';
  if (normalized === 'išlaidos') return 'expense';
  
  return null;
};

/**
 * Parse CSV file content into transactions
 * 
 * @param csvText - Raw CSV file content
 * @returns ParseResult with valid transactions and errors
 * 
 * Note: userId is handled by the service layer when transactions are added via hook
 */
export const parseCSV = (csvText: string): ParseResult => {
  const valid: Transaction[] = [];
  const errors: ParseError[] = [];
  
  // Split into lines and filter out empty lines
  const lines = csvText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  // Check if file is empty
  if (lines.length === 0) {
    return {
      valid: [],
      errors: [{
        row: 0,
        field: 'file',
        value: '',
        reason: 'File is empty'
      }],
      summary: {
        totalRows: 0,
        validRows: 0,
        errorRows: 1
      }
    };
  }
  
  // First line should be header (skip it) OR data
  let startIndex = 0;
  const firstLine = lines[0].toLowerCase();
  
  // Check if first line looks like a header
  if (firstLine.includes('date') || firstLine.includes('type') || firstLine.includes('amount')) {
    startIndex = 1; // Skip header
  }
  
  // Parse each data row
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const rowNumber = i + 1;
    
    // Split by comma (simple parser, doesn't handle quoted commas)
    const columns = line.split(',').map(col => col.trim());
    
    // Validate column count
    if (columns.length < 4) {
      errors.push({
        row: rowNumber,
        field: 'columns',
        value: line,
        reason: `Expected at least 4 columns, got ${columns.length}`
      });
      continue;
    }
    
    const [dateStr, typeStr, category, amountStr, ...descriptionParts] = columns;
    const description = descriptionParts.join(',').trim(); // Rejoin if description had commas
    
    // Validate date
    const date = parseDate(dateStr);
    if (!date) {
      errors.push({
        row: rowNumber,
        field: 'date',
        value: dateStr,
        reason: 'Invalid date format. Use YYYY-MM-DD'
      });
      continue;
    }
    
    // Validate type
    const type = normalizeType(typeStr);
    if (type === null) {
      errors.push({
        row: rowNumber,
        field: 'type',
        value: typeStr,
        reason: 'Type must be "income"/"expense" (English) or "Pajamos"/"Išlaidos" (Lithuanian)'
      });
      continue;
    }
    
    // Validate category
    if (!category || category.length === 0) {
      errors.push({
        row: rowNumber,
        field: 'category',
        value: category,
        reason: 'Category is required'
      });
      continue;
    }
    
    // Validate amount
    const amount = parseAmount(amountStr);
    if (amount === null || amount <= 0) {
      errors.push({
        row: rowNumber,
        field: 'amount',
        value: amountStr,
        reason: 'Amount must be a positive number'
      });
      continue;
    }
    
    // All validations passed - create transaction
    const transaction: Transaction = {
      id: generateUniqueId(),
      type: type,
      category,
      amount,
      description: description || '',
      date,
      createdAt: new Date()
    };
    
    valid.push(transaction);
  }
  
  return {
    valid,
    errors,
    summary: {
      totalRows: lines.length - startIndex,
      validRows: valid.length,
      errorRows: errors.length
    }
  };
};

/**
 * Parse date string in YYYY-MM-DD format
 */
const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  
  // Try parsing as YYYY-MM-DD
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  
  const [, year, month, day] = match;
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  
  // Validate date is valid
  if (isNaN(date.getTime())) return null;
  
  return date;
};

/**
 * Parse amount string to number
 */
const parseAmount = (amountStr: string): number | null => {
  if (!amountStr) return null;
  
  // Remove any currency symbols or spaces
  const cleaned = amountStr.replace(/[€$\s]/g, '');
  
  // Try parsing as number
  const amount = parseFloat(cleaned);
  
  // Validate it's a valid number
  if (isNaN(amount)) return null;
  
  return amount;
};

/**
 * Generate unique ID for transaction
 * Format: csv_timestamp_random
 */
const generateUniqueId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `csv_${timestamp}_${random}`;
};

/**
 * Validate CSV file before parsing
 * Quick check without full parsing
 */
export const validateCSVFile = (file: File): { valid: boolean; error?: string } => {
  // Check file type
  if (!file.name.endsWith('.csv')) {
    return {
      valid: false,
      error: 'File must be a CSV file (.csv extension)'
    };
  }
  
  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File is too large. Maximum size is 5MB'
    };
  }
  
  // Check file is not empty
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty'
    };
  }
  
  return { valid: true };
};
