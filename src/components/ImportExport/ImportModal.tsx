/**
 * ImportModal Component - CSV Import with Preview
 * 
 * Features:
 * ✨ Drag-and-drop file upload (nice-to-have)
 * ✨ Import preview before saving (nice-to-have)
 * ✅ File validation
 * ✅ Error reporting
 * ✅ Progress indication
 */

import React, { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { useTransactions } from '../../hooks/useTransactions';
import { parseCSV, validateCSVFile, ParseResult } from '../../utils/csv/parser';
import toast from 'react-hot-toast';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { add } = useTransactions();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  if (!isOpen) return null;

  const handleFileSelect = (selectedFile: File) => {
    // Validate file
    const validation = validateCSVFile(selectedFile);
    if (!validation.valid) {
      toast.error(validation.error || t('importExport.invalidFile'));
      return;
    }

    // Read and parse file
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = parseCSV(content); // userId handled by transaction service
      setParseResult(result);
      setShowPreview(true);
    };
    reader.onerror = () => {
      toast.error(t('importExport.parseError', { row: '0' }));
    };
    reader.readAsText(selectedFile);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleConfirmImport = async () => {
    if (!parseResult || parseResult.valid.length === 0) {
      toast.error(t('importExport.noTransactions'));
      return;
    }

    setIsImporting(true);

    try {
      // Import transactions one by one
      let successCount = 0;
      for (const transaction of parseResult.valid) {
        try {
          await add({
            type: transaction.type,
            category: transaction.category,
            amount: transaction.amount,
            description: transaction.description,
            date: transaction.date
          });
          successCount++;
        } catch (error) {
          console.error('Failed to import transaction:', error);
        }
      }

      // Show success message
      toast.success(t('importExport.importSuccess', { count: successCount.toString() }));

      // Close modal
      handleClose();
    } catch (error) {
      toast.error(t('importExport.importError', { error: 'Unknown error' }));
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setParseResult(null);
    setShowPreview(false);
    setIsDragging(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Upload className="h-6 w-6" />
            {t('importExport.importTransactions')}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!showPreview ? (
            <div className="space-y-6">
              {/* File Upload Area */}
              <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                }`}
              >
                <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {isDragging ? t('importExport.dragDropActive') : t('importExport.selectFile')}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {t('importExport.dragDrop')}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t('importExport.chooseFile')}
                </button>
              </div>

              {/* Format Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {t('importExport.csvFormat')}
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  {t('importExport.csvFormatDescription')}
                </p>
                <code className="block bg-white dark:bg-gray-800 px-3 py-2 rounded text-sm font-mono">
                  {t('importExport.csvExample')}
                </code>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t('importExport.totalRows')}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {parseResult?.summary.totalRows}
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    {t('importExport.validRows')}
                  </div>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {parseResult?.summary.validRows}
                  </div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                  <div className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {t('importExport.invalidRows')}
                  </div>
                  <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                    {parseResult?.summary.errorRows}
                  </div>
                </div>
              </div>

              {/* Preview Table */}
              {parseResult && parseResult.valid.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    {t('importExport.preview')} ({Math.min(parseResult.valid.length, 10)} {t('common.of')} {parseResult.valid.length})
                  </h3>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-96">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">{t('common.date')}</th>
                            <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">{t('common.type')}</th>
                            <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">{t('common.category')}</th>
                            <th className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{t('common.amount')}</th>
                            <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">{t('common.description')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {parseResult.valid.slice(0, 10).map((transaction, index) => (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                                {transaction.date.toLocaleDateString()}
                              </td>
                              <td className="px-4 py-2">
                                <span
                                  className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                    transaction.type === 'income'
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                  }`}
                                >
                                  {t(`common.${transaction.type}`)}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                                {transaction.category}
                              </td>
                              <td className="px-4 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                                €{transaction.amount.toFixed(2)}
                              </td>
                              <td className="px-4 py-2 text-gray-600 dark:text-gray-400 truncate max-w-xs">
                                {transaction.description}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Errors */}
              {parseResult && parseResult.errors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <h3 className="font-semibold text-red-900 dark:text-red-200 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    {t('importExport.errorList')}
                  </h3>
                  <ul className="space-y-1 max-h-40 overflow-y-auto">
                    {parseResult.errors.slice(0, 5).map((error, index) => (
                      <li key={index} className="text-sm text-red-800 dark:text-red-300">
                        • Row {error.row}: {error.field} - {error.reason}
                      </li>
                    ))}
                    {parseResult.errors.length > 5 && (
                      <li className="text-sm text-red-600 dark:text-red-400 italic">
                        ... and {parseResult.errors.length - 5} more errors
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            disabled={isImporting}
          >
            {t('importExport.cancel')}
          </button>
          {showPreview && parseResult && parseResult.valid.length > 0 && (
            <button
              onClick={handleConfirmImport}
              disabled={isImporting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isImporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('importExport.importing')}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  {t('importExport.confirmImport')} ({parseResult.valid.length})
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
