/**
 * ImportExportToolbar Component - Container for Import and Export Buttons
 * 
 * Combines ImportModal and ExportButton into a single toolbar
 * to be added to the TransactionList page
 */

import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { ImportModal } from './ImportModal';
import { ExportButton } from './ExportButton';

export const ImportExportToolbar: React.FC = () => {
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
        <ExportButton />
      </div>

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </>
  );
};
