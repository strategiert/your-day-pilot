/**
 * Geo-location and browser-based language detection
 */

export type SupportedLanguage = 'en' | 'de' | 'es' | 'fr' | 'it';

// Country code to language mapping
const COUNTRY_TO_LANGUAGE: Record<string, SupportedLanguage> = {
  // German-speaking countries
  DE: 'de',
  AT: 'de',
  CH: 'de',
  LI: 'de',
  LU: 'de',

  // Spanish-speaking countries
  ES: 'es',
  MX: 'es',
  AR: 'es',
  CO: 'es',
  PE: 'es',
  VE: 'es',
  CL: 'es',
  EC: 'es',
  GT: 'es',
  CU: 'es',
  BO: 'es',
  DO: 'es',
  HN: 'es',
  PY: 'es',
  SV: 'es',
  NI: 'es',
  CR: 'es',
  PA: 'es',
  UY: 'es',

  // French-speaking countries
  FR: 'fr',
  BE: 'fr',
  CA: 'fr',
  MC: 'fr',
  SN: 'fr',
  CI: 'fr',
  ML: 'fr',
  BF: 'fr',
  NE: 'fr',
  TD: 'fr',
  HT: 'fr',

  // Italian-speaking countries
  IT: 'it',
  SM: 'it',
  VA: 'it',
};

/**
 * Detect country from IP using ipapi.co (no API key required)
 */
async function detectCountryFromIP(): Promise<string | null> {
  try {
    const response = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });

    if (!response.ok) {
      console.warn('[i18n] Failed to fetch geo-location:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('[i18n] Detected country from IP:', data.country_code);
    return data.country_code;
  } catch (error) {
    console.warn('[i18n] Geo-location error:', error);
    return null;
  }
}

/**
 * Get language from country code
 */
function getLanguageFromCountry(countryCode: string): SupportedLanguage {
  const language = COUNTRY_TO_LANGUAGE[countryCode.toUpperCase()];
  return language || 'en'; // Default to English
}

/**
 * Detect language from browser settings
 */
function detectBrowserLanguage(): SupportedLanguage {
  const browserLang = navigator.language || navigator.languages?.[0] || 'en';
  const langCode = browserLang.split('-')[0].toLowerCase();

  const supportedLanguages: SupportedLanguage[] = ['en', 'de', 'es', 'fr', 'it'];
  if (supportedLanguages.includes(langCode as SupportedLanguage)) {
    return langCode as SupportedLanguage;
  }

  return 'en'; // Default to English
}

/**
 * Main language detection with priority:
 * 1. User preference (localStorage)
 * 2. Geo-location
 * 3. Browser language
 * 4. Default (English)
 */
export async function detectLanguage(): Promise<SupportedLanguage> {
  // Priority 1: User preference
  const savedLanguage = localStorage.getItem('preferredLanguage') as SupportedLanguage | null;
  if (savedLanguage) {
    console.log('[i18n] Using saved language preference:', savedLanguage);
    return savedLanguage;
  }

  // Priority 2: Geo-location
  try {
    const countryCode = await detectCountryFromIP();
    if (countryCode) {
      const geoLanguage = getLanguageFromCountry(countryCode);
      console.log('[i18n] Language from geo-location:', geoLanguage);
      return geoLanguage;
    }
  } catch (error) {
    console.warn('[i18n] Geo-location detection failed:', error);
  }

  // Priority 3: Browser language
  const browserLanguage = detectBrowserLanguage();
  console.log('[i18n] Using browser language:', browserLanguage);
  return browserLanguage;
}

/**
 * Save language preference
 */
export function saveLanguagePreference(language: SupportedLanguage): void {
  localStorage.setItem('preferredLanguage', language);
  console.log('[i18n] Saved language preference:', language);
}

/**
 * Get language name for display
 */
export function getLanguageName(language: SupportedLanguage): string {
  const names: Record<SupportedLanguage, string> = {
    en: 'English',
    de: 'Deutsch',
    es: 'Español',
    fr: 'Français',
    it: 'Italiano',
  };
  return names[language];
}

/**
 * Get language flag emoji
 */
export function getLanguageFlag(language: SupportedLanguage): string {
  const flags: Record<SupportedLanguage, string> = {
    en: '🇬🇧',
    de: '🇩🇪',
    es: '🇪🇸',
    fr: '🇫🇷',
    it: '🇮🇹',
  };
  return flags[language];
}
