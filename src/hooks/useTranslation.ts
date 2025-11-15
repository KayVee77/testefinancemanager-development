import { useLanguage } from '../contexts/LanguageContext';
import { translations, getTranslation } from '../i18n';

/**
 * Hook for translating strings
 * Usage: const { t } = useTranslation();
 *        t('dashboard.welcome', { name: 'John' })
 */
export function useTranslation() {
  const { language } = useLanguage();

  const t = (key: string, params?: Record<string, string | number>): string => {
    return getTranslation(translations[language], key, params);
  };

  return { t, language };
}
