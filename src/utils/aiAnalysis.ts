import { Transaction, Category } from '../types/Transaction';
import { startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import { API_BASE_URL, getApiUrl } from '../config/env';

/**
 * Follow-up prompt type for interactive flashcards
 */
export interface FollowUpPrompt {
  id: string;
  labelLT: string;
  labelEN: string;
  promptLT: string;
  promptEN: string;
  emoji: string;
}

/**
 * AI Budget Summary - Aggregated, anonymized financial data for AI analysis
 * NO PII: No transaction IDs, user IDs, descriptions, or personal identifiers
 */
export interface BudgetAiSummary {
  period: { 
    from: string;  // ISO date
    to: string;    // ISO date
  };
  currency: string;
  
  totalIncome: number;
  totalExpenses: number;
  savingsOrDeficit: number;  // positive = savings, negative = overspending
  
  expenseCategories: Array<{
    key: string;            // internal category key
    name: string;           // display name
    amount: number;
    shareOfExpenses: number;  // 0 to 1 (percentage as decimal)
  }>;
}

/**
 * Aggregate transactions for AI analysis
 * Only includes high-level metrics - no PII or raw descriptions
 */
export function aggregateBudgetForAi(
  transactions: Transaction[],
  period: { from: Date; to: Date },
  currency: string = 'EUR'
): BudgetAiSummary {
  // Filter transactions in the specified period
  const filtered = transactions.filter(
    t => t.date >= period.from && t.date <= period.to
  );

  // Calculate income and expenses
  const income = filtered
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const expenses = filtered
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Group expenses by category
  const categoryMap = new Map<string, number>();
  filtered
    .filter(t => t.type === 'expense')
    .forEach(t => {
      const current = categoryMap.get(t.category) || 0;
      categoryMap.set(t.category, current + t.amount);
    });

  // Convert to array and calculate percentages
  const expenseCategories = Array.from(categoryMap.entries())
    .map(([name, amount]) => ({
      key: name.toLowerCase().replace(/\s+/g, '_'),  // stable key
      name,
      amount,
      shareOfExpenses: expenses > 0 ? amount / expenses : 0,
    }))
    .sort((a, b) => b.amount - a.amount);  // Sort by amount descending

  return {
    period: {
      from: period.from.toISOString().split('T')[0],  // YYYY-MM-DD
      to: period.to.toISOString().split('T')[0],
    },
    currency,
    totalIncome: income,
    totalExpenses: expenses,
    savingsOrDeficit: income - expenses,
    expenseCategories,
  };
}

/**
 * Check if there's enough data for meaningful AI analysis
 * 
 * Rules:
 * - At least 3 transactions total (lowered from 10 for better UX)
 * - Must have at least one expense (income optional)
 * 
 * Note: Date span requirement removed to allow quick onboarding
 */
export function hasEnoughDataForAi(transactions: Transaction[]): boolean {
  // Need at least 3 transactions (lowered from 10)
  if (transactions.length < 3) {
    return false;
  }

  // Must have at least one expense to analyze spending
  const hasExpenses = transactions.some(t => t.type === 'expense');
  
  return hasExpenses;
}

/**
 * Call backend API to generate AI suggestions
 * Returns array of Lithuanian-language suggestions
 * 
 * Uses centralized API_BASE_URL from config/env.ts:
 * - local: http://localhost:3001 (dev-server)
 * - docker: /api (nginx proxy)
 * - production: /api (CloudFront proxy to API Gateway)
 */
export async function generateAISuggestions(
  summary: BudgetAiSummary,
  language: 'lt' | 'en' = 'lt'
): Promise<string[]> {
  // Use centralized API URL from config
  const apiUrl = getApiUrl('/ai/suggestions');
  
  console.log(`🤖 Calling AI API: ${apiUrl}`);
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ summary, language }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 422 && errorData.code === 'NOT_ENOUGH_DATA') {
        throw new Error(errorData.message || 'Nepakanka duomenų analizei');
      }

      if (response.status === 429) {
        throw new Error('Pasiektas užklausų limitas. Pabandykite vėliau.');
      }

      if (response.status === 500 && errorData.message) {
        throw new Error(errorData.message);
      }
      
      throw new Error('Nepavyko sugeneruoti pasiūlymų');
    }

    const data = await response.json();
    console.log(`✅ Received ${data.suggestions?.length || 0} suggestions`);
    
    return data.suggestions || [];
  } catch (error) {
    console.error('❌ AI suggestions error:', error);
    
    // If network error, show clear message
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Nepavyko prisijungti prie AI serverio. Patikrinkite, ar dev-server veikia (npm start dev-server/) arba AWS Lambda yra prieinamas.');
    }
    
    throw error instanceof Error 
      ? error 
      : new Error('Nepavyko sugeneruoti pasiūlymų. Patikrinkite interneto ryšį.');
  }
}

/**
 * Generate follow-up response based on user's flashcard selection
 * Takes the original summary and initial suggestions as context
 * 
 * @param followUpType - The follow-up mode type (DETAIL, EXAMPLE, CHALLENGE, QUICK_ACTIONS)
 * @param originalSummary - The original budget summary for context
 * @param initialSuggestions - The initial AI suggestions for reference
 * @param language - Language for the response
 */
export async function generateFollowUpResponse(
  followUpType: string,
  originalSummary: BudgetAiSummary,
  initialSuggestions: string[],
  language: 'lt' | 'en' = 'lt'
): Promise<string> {
  // Use centralized API URL from config
  const apiUrl = getApiUrl('/ai/follow-up');
  
  console.log(`🔄 Calling follow-up API: ${apiUrl}`);
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        followUpType,
        originalSummary,
        initialSuggestions,
        language 
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 429) {
        throw new Error('Pasiektas užklausų limitas. Pabandykite vėliau.');
      }

      if (response.status === 500 && errorData.message) {
        throw new Error(errorData.message);
      }
      
      throw new Error('Nepavyko sugeneruoti atsakymo');
    }

    const data = await response.json();
    console.log(`✅ Received follow-up response (${data.response?.length || 0} chars)`);
    
    return data.response || '';
  } catch (error) {
    console.error('❌ Follow-up error:', error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Nepavyko prisijungti prie AI serverio. Patikrinkite, ar dev-server veikia.');
    }
    
    throw error instanceof Error 
      ? error 
      : new Error('Nepavyko sugeneruoti atsakymo. Patikrinkite interneto ryšį.');
  }
}

/**
 * Predefined follow-up prompts (flashcards) for interactive demo
 * Reduced to 4 unique, distinct modes that align with backend implementation
 */
export const FOLLOW_UP_PROMPTS: FollowUpPrompt[] = [
  {
    id: 'DETAIL',
    emoji: '🔍',
    labelLT: 'Paaiškink detaliau',
    labelEN: 'Explain in detail',
    promptLT: 'Paaiškink vieną iš šių pasiūlymų detaliau su konkrečiais veiksmais.',
    promptEN: 'Explain one of these suggestions in more detail with specific steps.',
  },
  {
    id: 'EXAMPLE',
    emoji: '💡',
    labelLT: 'Duok pavyzdį',
    labelEN: 'Give me an example',
    promptLT: 'Duok konkretų pavyzdį, kaip galėčiau pritaikyti vieną iš šių pasiūlymų.',
    promptEN: 'Give me a concrete example of how I could apply one of these suggestions.',
  },
  {
    id: 'CHALLENGE',
    emoji: '🚀',
    labelLT: 'Taupymo iššūkis',
    labelEN: 'Savings challenge',
    promptLT: 'Sukurk man 7-14 dienų taupymo iššūkį su konkrečiais tikslais.',
    promptEN: 'Create a 7-14 day savings challenge for me with specific goals.',
  },
  {
    id: 'QUICK_ACTIONS',
    emoji: '⚡',
    labelLT: 'Greiti sprendimai',
    labelEN: 'Quick wins',
    promptLT: 'Kokius greičius pakeitimus galėčiau padaryti šią savaitę?',
    promptEN: 'What quick changes could I make this week to save money?',
  },
];


