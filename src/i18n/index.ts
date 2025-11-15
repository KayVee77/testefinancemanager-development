import { lt } from './locales/lt';
import { en } from './locales/en';

export type TranslationKey = string;
export type Translations = typeof lt;

export const translations = {
  lt,
  en,
};

export type Language = keyof typeof translations;

/**
 * Get nested translation value by dot notation key
 * Example: t('dashboard.welcome', { name: 'John' })
 */
export function getTranslation(
  translations: Translations,
  key: string,
  params?: Record<string, string | number>
): string {
  const keys = key.split('.');
  let value: any = translations;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
  }

  if (typeof value !== 'string') {
    console.warn(`Translation key is not a string: ${key}`);
    return key;
  }

  // Replace parameters like {name} with actual values
  if (params) {
    return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return params[paramKey] !== undefined ? String(params[paramKey]) : match;
    });
  }

  return value;
}

/**
 * Translate category name from Lithuanian to current language
 * Maps stored Lithuanian category names to translation keys
 */
export function translateCategoryName(
  categoryName: string,
  language: Language
): string {
  // Mapping of Lithuanian category names to translation keys
  const categoryKeyMap: Record<string, string> = {
    'Maistas': 'defaultCategories.food',
    'Transportas': 'defaultCategories.transport',
    'Pramogos': 'defaultCategories.entertainment',
    'Sveikatos priežiūra': 'defaultCategories.healthcare',
    'Mokesčiai': 'defaultCategories.bills',
    'Drabužiai': 'defaultCategories.clothing',
    'Atlyginimas': 'defaultCategories.salary',
    'Investicijos': 'defaultCategories.investments',
    'Kita': 'defaultCategories.other',
  };

  const translationKey = categoryKeyMap[categoryName];
  
  if (translationKey) {
    return getTranslation(translations[language], translationKey);
  }
  
  // If not a default category, return as-is (user-created category)
  return categoryName;
}
