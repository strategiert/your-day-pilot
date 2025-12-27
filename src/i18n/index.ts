import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { detectLanguage, type SupportedLanguage } from './detectLanguage';

// Import translation files
import commonEn from './locales/en/common.json';
import authEn from './locales/en/auth.json';
import settingsEn from './locales/en/settings.json';

import commonDe from './locales/de/common.json';
import authDe from './locales/de/auth.json';
import settingsDe from './locales/de/settings.json';

import commonEs from './locales/es/common.json';
import authEs from './locales/es/auth.json';
import settingsEs from './locales/es/settings.json';

import commonFr from './locales/fr/common.json';
import authFr from './locales/fr/auth.json';
import settingsFr from './locales/fr/settings.json';

import commonIt from './locales/it/common.json';
import authIt from './locales/it/auth.json';
import settingsIt from './locales/it/settings.json';

const resources = {
  en: {
    common: commonEn,
    auth: authEn,
    settings: settingsEn,
  },
  de: {
    common: commonDe,
    auth: authDe,
    settings: settingsDe,
  },
  es: {
    common: commonEs,
    auth: authEs,
    settings: settingsEs,
  },
  fr: {
    common: commonFr,
    auth: authFr,
    settings: settingsFr,
  },
  it: {
    common: commonIt,
    auth: authIt,
    settings: settingsIt,
  },
};

// Custom language detector with geo-location
const customDetector = {
  name: 'customDetector',
  async: true,
  lookup: async (callback: (lng: string) => void) => {
    try {
      const detectedLang = await detectLanguage();
      callback(detectedLang);
    } catch (error) {
      console.error('[i18n] Language detection failed:', error);
      callback('en'); // Fallback to English
    }
  },
  cacheUserLanguage: (lng: string) => {
    localStorage.setItem('preferredLanguage', lng);
  },
};

const languageDetector = new LanguageDetector();
languageDetector.addDetector(customDetector);

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'auth', 'settings'],

    detection: {
      order: ['customDetector', 'localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'preferredLanguage',
    },

    interpolation: {
      escapeValue: false, // React already escapes
    },

    react: {
      useSuspense: true,
    },
  });

export default i18n;
