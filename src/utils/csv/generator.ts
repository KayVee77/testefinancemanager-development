/**
 * CSV Generator - Export Transactions to CSV Files
 * 
 * Generates CSV format: Date,Type,Category,Amount,Description
 * Example: 2025-11-16,expense,Maistas,25.50,Lunch at restaurant
 * 
 * Features:
 * - Formats dates as YYYY-MM-DD
 * - Escapes special characters in descriptions
 * - Sorts by date (newest first)
 * - Generates proper filename with timestamp
 * - Translates types and categories based on language
 */

import { Transaction } from '../../types/Transaction';
import { format } from 'date-fns';
import { translateCategoryName, getTranslation, translations, type Language } from '../../i18n';

/**
 * Translate transaction type to selected language
 */
const translateType = (type: 'income' | 'expense', language: Language): string => {
  const key = type === 'income' ? 'common.income' : 'common.expense';
  return getTranslation(translations[language], key);
};

/**
 * Generate CSV content from transactions
 * 
 * @param transactions - Array of transactions to export
 * @param language - Language for type and category translations ('lt' or 'en')
 * @param includeHeader - Whether to include CSV header row
 * @returns CSV string content
 */
export const generateCSV = (
  transactions: Transaction[], 
  language: Language = 'lt',
  includeHeader = true
): string => {
  // Sort transactions by date (newest first)
  const sorted = [...transactions].sort((a, b) => b.date.getTime() - a.date.getTime());
  
  // Build CSV rows
  const rows: string[] = [];
  
  // Add header if requested
  if (includeHeader) {
    // Translate header based on language
    const dateLabel = getTranslation(translations[language], 'importExport.csvHeaders.date');
    const typeLabel = getTranslation(translations[language], 'importExport.csvHeaders.type');
    const categoryLabel = getTranslation(translations[language], 'importExport.csvHeaders.category');
    const amountLabel = getTranslation(translations[language], 'importExport.csvHeaders.amount');
    const descriptionLabel = getTranslation(translations[language], 'importExport.csvHeaders.description');
    
    rows.push(`${dateLabel},${typeLabel},${categoryLabel},${amountLabel},${descriptionLabel}`);
  }
  
  // Add data rows
  for (const transaction of sorted) {
    const row = [
      formatDate(transaction.date),
      translateType(transaction.type, language),
      escapeCSVField(translateCategoryName(transaction.category, language)),
      formatAmount(transaction.amount),
      escapeCSVField(transaction.description)
    ].join(',');
    
    rows.push(row);
  }
  
  return rows.join('\n');
};

/**
 * Format date as YYYY-MM-DD
 */
const formatDate = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

/**
 * Format amount with 2 decimal places
 */
const formatAmount = (amount: number): string => {
  return amount.toFixed(2);
};

/**
 * Escape CSV field if it contains special characters
 * Wraps in quotes if contains comma, newline, or quote
 */
const escapeCSVField = (field: string): string => {
  if (!field) return '';
  
  // Check if field needs escaping
  const needsEscape = field.includes(',') || field.includes('\n') || field.includes('"');
  
  if (needsEscape) {
    // Escape quotes by doubling them
    const escaped = field.replace(/"/g, '""');
    // Wrap in quotes
    return `"${escaped}"`;
  }
  
  return field;
};

/**
 * Generate filename for export
 * Format: financeflow-YYYY-MM-DD.csv
 */
export const generateFilename = (): string => {
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  return `financeflow-${dateStr}.csv`;
};

/**
 * Download CSV file in browser
 * 
 * @param csvContent - CSV string content
 * @param filename - Filename for download
 */
export const downloadCSV = (csvContent: string, filename: string): void => {
  // Add UTF-8 BOM (Byte Order Mark) to ensure proper encoding of Lithuanian characters
  // BOM tells Excel and other programs to use UTF-8 encoding
  const BOM = '\uFEFF';
  const csvWithBOM = BOM + csvContent;
  
  // Create blob from CSV content with UTF-8 encoding
  const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
  
  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up URL
  URL.revokeObjectURL(url);
};

/**
 * Generate sample CSV template for users
 * Contains header and example rows
 */
export const generateTemplate = (): string => {
  const header = 'Date,Type,Category,Amount,Description';
  const examples = [
    '2025-11-16,expense,Maistas,25.50,Lunch at restaurant',
    '2025-11-15,income,Atlyginimas,2000.00,Monthly salary',
    '2025-11-14,expense,Transportas,15.00,Bus ticket',
    '2025-11-13,expense,Pramogos,45.00,Movie tickets',
    '2025-11-12,expense,Mokesčiai,120.00,Electricity bill'
  ];
  
  return [header, ...examples].join('\n');
};
