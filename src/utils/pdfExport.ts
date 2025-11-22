import { BudgetAiSummary } from './aiAnalysis';
import { format } from 'date-fns';

/**
 * Translation keys for TXT export
 * Uses proper i18n structure matching lt.ts and en.ts
 */
interface ExportTranslations {
  title: string;
  generatedOn: string;
  analyzedPeriod: string;
  financialSummary: string;
  income: string;
  expenses: string;
  balance: string;
  savingsRate: string;
  topCategories: string;
  aiSuggestions: string;
  aiResponse: string;
  disclaimer: string;
}

/**
 * Export AI budget analysis to TXT file
 * Supports both Lithuanian and English languages
 */
export function exportAiAnalysisToPdf(
  summary: BudgetAiSummary,
  suggestions: string[],
  followUpResponse: string | null,
  language: 'lt' | 'en' = 'lt'
): void {
  const t = getTranslations(language);
  
  // Calculate savings rate
  const savingsRate = summary.totalIncome > 0 
    ? (summary.savingsOrDeficit / summary.totalIncome * 100) 
    : 0;

  // Extract top categories
  const topCategories = summary.expenseCategories.slice(0, 5);

  // Build TXT content
  let txtContent = '';
  
  // Header
  txtContent += '=' .repeat(60) + '\n';
  txtContent += 'FinanceFlow - ' + t.title + '\n';
  txtContent += '='.repeat(60) + '\n\n';
  
  // Date and period
  txtContent += `${t.generatedOn}: ${format(new Date(), 'yyyy-MM-dd HH:mm')}\n`;
  txtContent += `${t.analyzedPeriod}: ${summary.period.from} - ${summary.period.to}\n\n`;
  
  // Financial Summary
  txtContent += '-'.repeat(60) + '\n';
  txtContent += t.financialSummary + '\n';
  txtContent += '-'.repeat(60) + '\n';
  txtContent += `${t.income}:        EUR ${summary.totalIncome.toFixed(2)}\n`;
  txtContent += `${t.expenses}:      EUR ${summary.totalExpenses.toFixed(2)}\n`;
  txtContent += `${t.balance}:       EUR ${summary.savingsOrDeficit.toFixed(2)}\n`;
  txtContent += `${t.savingsRate}:   ${savingsRate.toFixed(1)}%\n\n`;
  
  // Top Categories
  if (topCategories.length > 0) {
    txtContent += '-'.repeat(60) + '\n';
    txtContent += t.topCategories + '\n';
    txtContent += '-'.repeat(60) + '\n';
    topCategories.forEach((cat, index) => {
      const percentage = (cat.shareOfExpenses * 100).toFixed(0);
      txtContent += `${index + 1}. ${cat.name.padEnd(20)} EUR ${cat.amount.toFixed(2).padStart(8)} (${percentage}%)\n`;
    });
    txtContent += '\n';
  }
  
  // AI Suggestions
  txtContent += '='.repeat(60) + '\n';
  txtContent += t.aiSuggestions + '\n';
  txtContent += '='.repeat(60) + '\n\n';
  
  suggestions.forEach((suggestion, index) => {
    // Clean text: remove emojis
    // eslint-disable-next-line no-control-regex
    const cleanText = suggestion
      .replace(/^\d+\.\s*/, '')
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
      .replace(/[\u{2600}-\u{26FF}]/gu, '')
      .replace(/[\u{2700}-\u{27BF}]/gu, '')
      .trim();
    
    txtContent += `${index + 1}. ${cleanText}\n\n`;
  });
  
  // Follow-up Response
  if (followUpResponse) {
    txtContent += '-'.repeat(60) + '\n';
    txtContent += t.aiResponse + '\n';
    txtContent += '-'.repeat(60) + '\n\n';
    
    // Clean follow-up text
    // eslint-disable-next-line no-control-regex
    const cleanFollowUp = followUpResponse
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
      .replace(/[\u{2600}-\u{26FF}]/gu, '')
      .replace(/[\u{2700}-\u{27BF}]/gu, '')
      .trim();
    
    txtContent += cleanFollowUp + '\n\n';
  }
  
  // Footer
  txtContent += '='.repeat(60) + '\n';
  txtContent += t.disclaimer + '\n';
  txtContent += '='.repeat(60) + '\n';

  // Create blob and download with UTF-8 BOM for proper encoding
  const BOM = '\uFEFF'; // UTF-8 BOM
  const blob = new Blob([BOM + txtContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmm');
  link.download = `FinanceFlow_AI_Analysis_${timestamp}.txt`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get translations for TXT export content
 * Matches the structure in src/i18n/locales/lt.ts and en.ts
 */
function getTranslations(language: 'lt' | 'en'): ExportTranslations {
  if (language === 'en') {
    return {
      title: 'AI Budget Analysis',
      generatedOn: 'Generated on',
      analyzedPeriod: 'Analyzed period',
      financialSummary: 'Financial Summary',
      income: 'Total Income',
      expenses: 'Total Expenses',
      balance: 'Net Balance',
      savingsRate: 'Savings Rate',
      topCategories: 'Top Expense Categories',
      aiSuggestions: 'AI Suggestions',
      aiResponse: 'AI Follow-up Response',
      disclaimer: 'Important: These suggestions are for informational purposes only and do not constitute individual financial advice. Always consider your personal situation before making financial decisions.',
    };
  }
  
  // Lithuanian translations - proper UTF-8 characters (UTF-8 BOM handles encoding)
  return {
    title: 'DI Biudžeto Analizė',
    generatedOn: 'Sugeneruota',
    analyzedPeriod: 'Analizuojamas laikotarpis',
    financialSummary: 'Finansinė Suvestinė',
    income: 'Bendros Pajamos',
    expenses: 'Bendros Išlaidos',
    balance: 'Balansas',
    savingsRate: 'Taupymo Rodiklis',
    topCategories: 'Pagrindinės Išlaidų Kategorijos',
    aiSuggestions: 'DI Pasiūlymai',
    aiResponse: 'DI Papildomas Atsakymas',
    disclaimer: 'Svarbu: Pasiūlymai yra rekomendacinio pobūdžio ir nėra individuali finansinė konsultacija. Visada apsvarstykite savo asmeninę situaciją prieš priimdami finansinius sprendimus.',
  };
}
