/**
 * ExportButton Component - Export Transactions to CSV
 * 
 * Features:
 * ✅ Export all transactions
 * ✅ Download with timestamped filename
 * ✅ Success feedback
 * ✅ Handles empty state
 */

import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { useTransactions } from '../../hooks/useTransactions';
import { generateCSV, generateFilename, downloadCSV } from '../../utils/csv/generator';
import toast from 'react-hot-toast';

export const ExportButton: React.FC = () => {
  const { t, language } = useTranslation();
  const { transactions } = useTransactions();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (transactions.length === 0) {
      toast.error(t('importExport.noTransactions'));
      return;
    }

    setIsExporting(true);

    try {
      // Generate CSV content with language-specific translations
      const csvContent = generateCSV(transactions, language, true);
      
      // Generate filename
      const filename = generateFilename();
      
      // Trigger download
      downloadCSV(csvContent, filename);
      
      // Show success message
      toast.success(t('importExport.exportSuccess'));
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t('importExport.exportError', { error: 'Unknown error' }));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting || transactions.length === 0}
      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      title={transactions.length === 0 ? t('importExport.noTransactions') : t('importExport.exportCSV')}
    >
      {isExporting ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          {t('importExport.exporting')}
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          {t('importExport.export')}
        </>
      )}
    </button>
  );
};
