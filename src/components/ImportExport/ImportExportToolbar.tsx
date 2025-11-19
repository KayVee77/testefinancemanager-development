/**
 * ImportExportToolbar Component - Container for Import and Export Buttons
 * 
 * Combines ImportModal and ExportButton into a single toolbar
 * to be added to the TransactionList page
 * 
 * ✨ ENHANCED for Bug 6:
 * - Added optional transactions prop to support exporting filtered data
 * - Passes transactions to ExportButton for filtered exports
 */

import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { Transaction } from '../../types/Transaction';
import { ImportModal } from './ImportModal';
import { ExportButton } from './ExportButton';

interface ImportExportToolbarProps {
  /**
   * Optional: Specific transactions to export (e.g., filtered subset)
   * If not provided, ExportButton will export all transactions from store
   */
  transactions?: Transaction[];
}

export const ImportExportToolbar: React.FC<ImportExportToolbarProps> = ({ transactions }) => {
  const { t } = useTranslation();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3">
        {/* Import Button */}
        <button
          onClick={() => setIsImportModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Upload className="h-4 w-4" />
          {t('importExport.import')}
        </button>

        {/* Export Button */}
        <ExportButton transactions={transactions} />
      </div>

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </>
  );
};
