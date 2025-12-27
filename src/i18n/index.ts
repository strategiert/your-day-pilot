import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

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

// Supported languages
const supportedLanguages = ['en', 'de', 'es', 'fr', 'it'];

// Simple synchronous custom detector
const customDetector = {
  name: 'customDetector',
  lookup: (): string | undefined => {
    // Check localStorage first
    const stored = localStorage.getItem('preferredLanguage');
    if (stored && supportedLanguages.includes(stored)) {
      return stored;
    }
    return undefined;
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
      order: ['localStorage', 'navigator', 'customDetector'],
      caches: ['localStorage'],
      lookupLocalStorage: 'preferredLanguage',
    },

    interpolation: {
      escapeValue: false, // React already escapes
    },

    react: {
      useSuspense: false, // Disable suspense to prevent hanging with async language detection
    },
  });

export default i18n;
